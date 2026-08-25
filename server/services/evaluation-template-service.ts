import { createHash, randomUUID } from 'node:crypto'
import { Prisma, type PrismaClient } from '@prisma/client'
import type { EvaluationTemplateCreateInput, EvaluationTemplateVersionCreateInput } from '../../shared/schemas/evaluation-template'
import type { SessionActor } from '../../shared/types/api'
import { DomainError, isUniqueConstraintError } from '../domain/errors'
import { requireRole } from '../policies/authorization'

const json = (value: unknown) => value as Prisma.InputJsonValue
type ItemInput = EvaluationTemplateVersionCreateInput['items'][number]

function normalizedItems(items: readonly ItemInput[]) {
  return items.map((item, index) => ({
    code: item.code.toUpperCase(), label: item.label, answerType: item.answerType, required: item.required,
    maxScore: item.maxScore ?? null, weight: item.weight, sortOrder: index + 1,
  }))
}

function contentHash(items: ReturnType<typeof normalizedItems>): string {
  return createHash('sha256').update(JSON.stringify(items)).digest('hex')
}

async function audit(tx: Prisma.TransactionClient, actorId: string, action: string, entityId: string, before: unknown, after: unknown): Promise<void> {
  await tx.auditLog.create({ data: { actorId, action, entityType: 'EvaluationTemplate', entityId, requestId: randomUUID(), beforeData: before == null ? Prisma.JsonNull : json(before), afterData: json(after) } })
}

export async function createEvaluationTemplate(db: PrismaClient, actor: SessionActor, input: EvaluationTemplateCreateInput): Promise<{ id: string, versionId: string, version: number }> {
  requireRole(actor, 'ADMIN')
  const items = normalizedItems(input.items)
  try {
    return await db.$transaction(async (tx) => {
      const template = await tx.evaluationTemplate.create({ data: {
        code: input.code.toUpperCase(), subject: input.subject, name: input.name, createdById: actor.userId, updatedById: actor.userId,
        versions: { create: { version: 1, contentHash: contentHash(items), items: { create: items } } },
      }, include: { versions: { select: { id: true, version: true }, take: 1 } } })
      const version = template.versions[0]
      if (!version) throw new DomainError('CONFLICT', 'Template version could not be created')
      await audit(tx, actor.userId, 'EVALUATION_TEMPLATE_CREATED', template.id, null, { templateId: template.id, versionId: version.id, version: 1 })
      return { id: template.id, versionId: version.id, version: version.version }
    })
  } catch (error) {
    if (isUniqueConstraintError(error)) throw new DomainError('CONFLICT', 'Evaluation template code or item code already exists')
    throw error
  }
}

export async function createEvaluationTemplateVersion(db: PrismaClient, actor: SessionActor, templateId: string, input: EvaluationTemplateVersionCreateInput): Promise<{ id: string, version: number, status: 'DRAFT' }> {
  requireRole(actor, 'ADMIN')
  const items = normalizedItems(input.items)
  try {
    return await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM evaluation_templates WHERE id = ${templateId} FOR UPDATE`
      const template = await tx.evaluationTemplate.findUnique({ where: { id: templateId }, select: { id: true, isActive: true } })
      if (!template?.isActive) throw new DomainError('NOT_FOUND', 'Active evaluation template was not found')
      const latest = await tx.evaluationTemplateVersion.findFirst({ where: { templateId }, orderBy: { version: 'desc' }, select: { version: true } })
      const versionNumber = (latest?.version ?? 0) + 1
      const version = await tx.evaluationTemplateVersion.create({ data: {
        templateId, version: versionNumber, contentHash: contentHash(items), items: { create: items },
      }, select: { id: true, version: true, status: true } })
      await audit(tx, actor.userId, 'EVALUATION_TEMPLATE_VERSION_CREATED', templateId, latest, version)
      return { id: version.id, version: version.version, status: 'DRAFT' }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  } catch (error) {
    if (isUniqueConstraintError(error)) throw new DomainError('CONFLICT', 'Template version changed concurrently; retry')
    throw error
  }
}

export async function publishEvaluationTemplateVersion(db: PrismaClient, actor: SessionActor, versionId: string, now = new Date()): Promise<{ id: string, status: 'PUBLISHED' }> {
  requireRole(actor, 'ADMIN')
  return await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM evaluation_template_versions WHERE id = ${versionId} FOR UPDATE`
    const version = await tx.evaluationTemplateVersion.findUnique({ where: { id: versionId }, include: { items: true, template: true } })
    if (!version?.template.isActive) throw new DomainError('NOT_FOUND', 'Active template version was not found')
    if (version.status !== 'DRAFT') throw new DomainError('INVALID_STATE', 'Only a draft template version can be published')
    if (!version.items.length) throw new DomainError('VALIDATION_FAILED', 'Template version must contain at least one item')
    await tx.evaluationTemplateVersion.updateMany({ where: { templateId: version.templateId, status: 'PUBLISHED' }, data: { status: 'RETIRED' } })
    const changed = await tx.evaluationTemplateVersion.updateMany({ where: { id: version.id, status: 'DRAFT' }, data: { status: 'PUBLISHED', publishedAt: now, publishedById: actor.userId } })
    if (changed.count !== 1) throw new DomainError('CONFLICT', 'Template version changed; reload and try again')
    await audit(tx, actor.userId, 'EVALUATION_TEMPLATE_VERSION_PUBLISHED', version.templateId, { versionId: version.id, status: 'DRAFT' }, { versionId: version.id, status: 'PUBLISHED', publishedAt: now })
    return { id: version.id, status: 'PUBLISHED' }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
}
