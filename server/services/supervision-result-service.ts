import type { Prisma, PrismaClient } from '@prisma/client'
import type { SessionActor } from '../../shared/types/api'
import { DomainError } from '../domain/errors'

const json = (value: unknown) => value as Prisma.InputJsonValue

export async function saveSupervisionResult(db: PrismaClient, actor: SessionActor, input: { visitId: string, studentTermId: string, outcome: 'COMPLETED' | 'ABSENT' | 'MAKEUP_REQUIRED', summary?: string, expectedVersion?: number, reason?: string }) {
  if (actor.role !== 'LECTURER' || !actor.lecturerId) throw new DomainError('FORBIDDEN', 'Only an assigned lecturer can record supervision results')
  return await db.$transaction(async (tx) => {
    const member = await tx.visitStudent.findUnique({ where: { visitId_studentTermId: { visitId: input.visitId, studentTermId: input.studentTermId } }, include: { visit: { include: { lecturers: true } }, result: true } })
    if (!member || !member.visit.lecturers.some(lecturer => lecturer.lecturerId === actor.lecturerId)) throw new DomainError('NOT_FOUND', 'Assigned visit student was not found')
    if (member.visit.status === 'CANCELLED') throw new DomainError('INVALID_STATE', 'A cancelled visit cannot receive results')
    if (member.result) {
      if (!input.reason) throw new DomainError('VALIDATION_FAILED', 'A reason is required to correct a supervision result')
      if (member.result.version !== input.expectedVersion) throw new DomainError('CONFLICT', 'Result changed; reload and try again')
      const result = await tx.supervisionResult.update({ where: { id: member.result.id }, data: { outcome: input.outcome, summary: input.summary, version: { increment: 1 }, submittedById: actor.userId, submittedAt: new Date() } })
      await tx.supervisionResultVersion.create({ data: { supervisionResultId: result.id, version: result.version, snapshot: json({ before: member.result, after: result }), reason: input.reason, actorId: actor.userId } })
      return result
    }
    return await tx.supervisionResult.create({ data: { visitStudentId: member.id, outcome: input.outcome, summary: input.summary, submittedById: actor.userId, submittedAt: new Date() } })
  })
}
