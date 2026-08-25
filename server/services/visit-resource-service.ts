import type { Prisma, PrismaClient } from '@prisma/client'
import type { SessionActor } from '../../shared/types/api'
import { DomainError } from '../domain/errors'

async function visitAndAssignment(db: PrismaClient | Prisma.TransactionClient, actor: SessionActor, visitId: string) {
  const visit = await db.supervisionVisit.findUnique({ where: { id: visitId }, include: { students: true, lecturers: true } })
  if (!visit) throw new DomainError('NOT_FOUND', 'Visit was not found')
  const assigned = actor.role === 'ADMIN' || (actor.role === 'LECTURER' && actor.lecturerId && visit.lecturers.some(item => item.lecturerId === actor.lecturerId)) || (actor.role === 'STUDENT' && actor.studentTermId && visit.students.some(item => item.studentTermId === actor.studentTermId))
  if (!assigned) throw new DomainError('NOT_FOUND', 'Visit was not found')
  return visit
}

export async function acknowledgeVisit(db: PrismaClient, actor: SessionActor, visitId: string) {
  const visit = await visitAndAssignment(db, actor, visitId)
  if (actor.role === 'STUDENT') return await db.visitStudent.update({ where: { visitId_studentTermId: { visitId: visit.id, studentTermId: actor.studentTermId! } }, data: { acknowledgementStatus: 'ACKNOWLEDGED', acknowledgedAt: new Date() } })
  if (actor.role === 'LECTURER') return await db.visitLecturer.update({ where: { visitId_lecturerId: { visitId: visit.id, lecturerId: actor.lecturerId! } }, data: { acknowledgementStatus: 'ACKNOWLEDGED', acknowledgedAt: new Date() } })
  throw new DomainError('FORBIDDEN', 'Admin does not acknowledge visit assignments')
}

export async function addInternalNote(db: PrismaClient, actor: SessionActor, visitId: string, content: string) {
  await visitAndAssignment(db, actor, visitId)
  if (actor.role !== 'LECTURER') throw new DomainError('FORBIDDEN', 'Internal notes are lecturer-only')
  return await db.internalNote.create({ data: { visitId, authorId: actor.userId, content, visibility: 'STAFF_ONLY' } })
}

export async function addCompanyRequirement(db: PrismaClient, actor: SessionActor, input: { visitId: string, placementId?: string, category: string, technology?: string, detail: string }) {
  await visitAndAssignment(db, actor, input.visitId)
  if (actor.role !== 'LECTURER') throw new DomainError('FORBIDDEN', 'Company requirements are lecturer-only')
  if (input.placementId) {
    const placement = await db.placement.findUnique({ where: { id: input.placementId } })
    if (!placement) throw new DomainError('NOT_FOUND', 'Placement was not found')
  }
  return await db.companyRequirement.create({ data: { ...input, authorId: actor.userId } })
}
