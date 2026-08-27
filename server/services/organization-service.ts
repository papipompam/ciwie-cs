import { randomUUID } from 'node:crypto'
import { Prisma, type PrismaClient } from '@prisma/client'
import type { CreateApplicationInput } from '../../shared/schemas/application'
import type { OrganizationCreateInput, WorkSiteCreateInput } from '../../shared/schemas/organization'
import type { SessionActor } from '../../shared/types/api'
import { DomainError, isUniqueConstraintError } from '../domain/errors'
import { requireRole } from '../policies/authorization'

const json = (value: unknown) => value as Prisma.InputJsonValue

export function normalizeOrganizationName(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('th-TH')
}

async function audit(tx: Prisma.TransactionClient, actorId: string, action: string, entityId: string, before: unknown, after: unknown, reason?: string): Promise<void> {
  await tx.auditLog.create({ data: { actorId, action, entityType: 'Organization', entityId, requestId: randomUUID(), reason, beforeData: before == null ? Prisma.JsonNull : json(before), afterData: json(after) } })
}

export async function suggestOrganizationDuplicates(db: PrismaClient, actor: SessionActor, name: string, taxId?: string): Promise<Array<{ id: string, nameTh: string, nameEn: string | null, taxId: string | null, workSiteCount: number }>> {
  requireRole(actor, 'STUDENT', 'LECTURER', 'ADMIN')
  const normalizedName = normalizeOrganizationName(name)
  const organizations = await db.organization.findMany({
    where: { isActive: true, OR: [{ normalizedName: { contains: normalizedName } }, ...(taxId ? [{ taxId }] : [])] },
    orderBy: [{ normalizedName: 'asc' }, { id: 'asc' }],
    take: 10,
    include: { _count: { select: { workSites: true } } },
  })
  return organizations.map(row => ({ id: row.id, nameTh: row.nameTh, nameEn: row.nameEn, taxId: row.taxId, workSiteCount: row._count.workSites }))
}

export async function createOrganization(db: PrismaClient, actor: SessionActor, input: OrganizationCreateInput): Promise<{ id: string }> {
  requireRole(actor, 'STUDENT', 'LECTURER', 'ADMIN')
  const normalizedName = normalizeOrganizationName(input.nameTh)
  const duplicate = await db.organization.findFirst({ where: { isActive: true, OR: [{ normalizedName }, ...(input.taxId ? [{ taxId: input.taxId }] : [])] }, select: { id: true } })
  if (duplicate) throw new DomainError('CONFLICT', 'A matching organization already exists; review duplicate suggestions')
  try {
    return await db.$transaction(async (tx) => {
      const organization = await tx.organization.create({ data: { ...input, normalizedName, createdById: actor.userId, updatedById: actor.userId }, select: { id: true } })
      await audit(tx, actor.userId, 'ORGANIZATION_CREATED', organization.id, null, { ...input, normalizedName })
      return organization
    })
  } catch (error) {
    if (isUniqueConstraintError(error)) throw new DomainError('CONFLICT', 'An organization with the same tax id already exists')
    throw error
  }
}

export async function updateOrganization(db: PrismaClient, actor: SessionActor, id: string, input: OrganizationCreateInput & { reason: string }) {
  requireRole(actor, 'ADMIN')
  return await db.$transaction(async (tx) => {
    const current = await tx.organization.findUnique({ where: { id } })
    if (!current || !current.isActive) throw new DomainError('NOT_FOUND', 'Organization was not found')
    const updated = await tx.organization.update({ where: { id }, data: { nameTh: input.nameTh, nameEn: input.nameEn, taxId: input.taxId, normalizedName: normalizeOrganizationName(input.nameTh), updatedById: actor.userId } })
    await audit(tx, actor.userId, 'ORGANIZATION_UPDATED', id, current, updated, input.reason)
    return updated
  })
}

export async function createWorkSite(db: PrismaClient, actor: SessionActor, input: WorkSiteCreateInput): Promise<{ id: string, contactId?: string }> {
  requireRole(actor, 'STUDENT', 'LECTURER', 'ADMIN')
  const normalizedName = normalizeOrganizationName(input.name)
  try {
    return await db.$transaction(async (tx) => {
      const organization = await tx.organization.findUnique({ where: { id: input.organizationId }, select: { id: true, isActive: true } })
      if (!organization?.isActive) throw new DomainError('NOT_FOUND', 'Active organization was not found')
      const site = await tx.workSite.create({ data: {
        organizationId: input.organizationId, name: input.name, normalizedName, addressLine: input.addressLine,
        province: input.province, region: input.region, postalCode: input.postalCode,
      }, select: { id: true } })
      const contact = input.contact
        ? await tx.organizationContact.create({ data: { organizationId: input.organizationId, workSiteId: site.id, ...input.contact }, select: { id: true } })
        : null
      await tx.auditLog.create({ data: { actorId: actor.userId, action: 'WORK_SITE_CREATED', entityType: 'WorkSite', entityId: site.id, requestId: randomUUID(), afterData: json({ ...input, normalizedName, contactId: contact?.id }) } })
      return { id: site.id, ...(contact ? { contactId: contact.id } : {}) }
    })
  } catch (error) {
    if (isUniqueConstraintError(error)) throw new DomainError('CONFLICT', 'This organization already has a work site with the same normalized name')
    throw error
  }
}

export async function createStudentApplication(db: PrismaClient, actor: SessionActor, input: CreateApplicationInput): Promise<{ id: string, status: 'SUBMITTED' }> {
  requireRole(actor, 'STUDENT')
  if (actor.studentTermId !== input.studentTermId) throw new DomainError('NOT_FOUND', 'Student term was not found')
  return await db.$transaction(async (tx) => {
    const [enrollment, site, contact, evidenceFiles] = await Promise.all([
      tx.studentTermEnrollment.findFirst({ where: { id: input.studentTermId, coopTerm: { isActive: true } }, select: { id: true, coopTermId: true } }),
      tx.workSite.findFirst({ where: { id: input.workSiteId, isActive: true, organization: { isActive: true } }, select: { id: true, organizationId: true } }),
      input.contactId ? tx.organizationContact.findFirst({ where: { id: input.contactId, isActive: true }, select: { id: true, organizationId: true, workSiteId: true, name: true, position: true, email: true, phone: true } }) : null,
      input.evidenceFileVersionIds.length
        ? tx.fileVersion.findMany({ where: { id: { in: input.evidenceFileVersionIds }, createdById: actor.userId, scanStatus: 'CLEAN' }, select: { id: true } })
        : Promise.resolve([]),
    ])
    if (!enrollment || !site) throw new DomainError('NOT_FOUND', 'Active student term or work site was not found')
    if (input.contactId && (!contact || contact.organizationId !== site.organizationId || (contact.workSiteId && contact.workSiteId !== site.id))) {
      throw new DomainError('VALIDATION_FAILED', 'Contact does not belong to the selected organization/work site')
    }
    if (evidenceFiles.length !== input.evidenceFileVersionIds.length) {
      throw new DomainError('VALIDATION_FAILED', 'Every evidence file must be clean and owned by the student')
    }
    const application = await tx.application.create({ data: {
      studentTermId: enrollment.id,
      coopTermId: enrollment.coopTermId,
      workSiteId: site.id,
      contactId: contact?.id,
      contactSnapshot: contact ? json({ ...contact, applicationNote: input.note }) : input.note ? json({ applicationNote: input.note }) : undefined,
      positionTitle: input.positionTitle,
      appliedAt: new Date(`${input.appliedAt}T00:00:00.000Z`),
      evidenceFiles: input.evidenceFileVersionIds.length ? { create: input.evidenceFileVersionIds.map(fileVersionId => ({ fileVersionId })) } : undefined,
      createdById: actor.userId,
      updatedById: actor.userId,
    }, select: { id: true, status: true } })
    const snapshot = { workSiteId: site.id, contactId: contact?.id, positionTitle: input.positionTitle, appliedAt: input.appliedAt, evidenceFileVersionIds: input.evidenceFileVersionIds }
    await tx.applicationStatusHistory.create({ data: { applicationId: application.id, toStatus: 'SUBMITTED', actorId: actor.userId, snapshot: json(snapshot) } })
    await tx.auditLog.create({ data: { actorId: actor.userId, action: 'APPLICATION_CREATED', entityType: 'Application', entityId: application.id, requestId: randomUUID(), afterData: json({ ...application, studentTermId: enrollment.id, ...snapshot }) } })
    return { id: application.id, status: 'SUBMITTED' }
  })
}

export async function previewOrganizationMerge(db: PrismaClient, actor: SessionActor, sourceId: string, targetId: string): Promise<{ source: { id: string, nameTh: string }, target: { id: string, nameTh: string }, affected: { workSites: number, contacts: number, aliases: number }, conflicts: string[] }> {
  requireRole(actor, 'ADMIN')
  if (sourceId === targetId) throw new DomainError('VALIDATION_FAILED', 'Source and target organizations must differ')
  const [source, target] = await Promise.all([
    db.organization.findUnique({ where: { id: sourceId }, include: { workSites: true, _count: { select: { contacts: true, aliases: true } } } }),
    db.organization.findUnique({ where: { id: targetId }, include: { workSites: true } }),
  ])
  if (!source?.isActive || !target?.isActive) throw new DomainError('NOT_FOUND', 'Active source or target organization was not found')
  const targetNames = new Set(target.workSites.map(site => site.normalizedName))
  const conflicts = source.workSites.filter(site => targetNames.has(site.normalizedName)).map(site => site.name)
  return {
    source: { id: source.id, nameTh: source.nameTh }, target: { id: target.id, nameTh: target.nameTh },
    affected: { workSites: source.workSites.length, contacts: source._count.contacts, aliases: source._count.aliases }, conflicts,
  }
}

export async function mergeOrganization(db: PrismaClient, actor: SessionActor, sourceId: string, targetId: string, reason: string): Promise<{ sourceId: string, targetId: string }> {
  requireRole(actor, 'ADMIN')
  const preview = await previewOrganizationMerge(db, actor, sourceId, targetId)
  if (preview.conflicts.length) throw new DomainError('CONFLICT', 'Work site names conflict; resolve them before merging')
  try {
    return await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM organizations WHERE id IN (${sourceId}, ${targetId}) ORDER BY id FOR UPDATE`
      const [source, target] = await Promise.all([
        tx.organization.findUnique({ where: { id: sourceId }, include: { workSites: true, contacts: true, aliases: true } }),
        tx.organization.findUnique({ where: { id: targetId } }),
      ])
      if (!source?.isActive || !target?.isActive) throw new DomainError('CONFLICT', 'Organization changed after merge preview')
      const existingAlias = await tx.organizationAlias.findUnique({ where: { normalizedAlias: source.normalizedName } })
      if (existingAlias && ![source.id, target.id].includes(existingAlias.organizationId)) throw new DomainError('CONFLICT', 'Source name is already an alias of another organization')
      await tx.workSite.updateMany({ where: { organizationId: source.id }, data: { organizationId: target.id } })
      await tx.organizationContact.updateMany({ where: { organizationId: source.id }, data: { organizationId: target.id } })
      await tx.organizationAlias.updateMany({ where: { organizationId: source.id }, data: { organizationId: target.id } })
      if (!existingAlias) await tx.organizationAlias.create({ data: { organizationId: target.id, normalizedAlias: source.normalizedName, displayAlias: source.nameTh } })
      else if (existingAlias.organizationId === source.id) await tx.organizationAlias.update({ where: { id: existingAlias.id }, data: { organizationId: target.id } })
      await tx.organization.update({ where: { id: source.id }, data: { isActive: false, updatedById: actor.userId } })
      await tx.organizationMergeHistory.create({ data: { sourceOrganizationId: source.id, targetOrganizationId: target.id, actorId: actor.userId, reason, sourceSnapshot: json(source) } })
      await audit(tx, actor.userId, 'ORGANIZATION_MERGED', source.id, source, { targetOrganizationId: target.id, sourceActive: false }, reason)
      return { sourceId: source.id, targetId: target.id }
    })
  } catch (error) {
    if (isUniqueConstraintError(error)) throw new DomainError('CONFLICT', 'Organization merge conflicts with existing work site or alias data')
    throw error
  }
}
