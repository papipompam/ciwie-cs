import { defineEventHandler, getRouterParam } from 'h3'
import { DomainError } from '../../domain/errors'
import { getCorrelationId, getSessionActor, toHttpError } from '../../utils/http'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => { const correlationId = getCorrelationId(event); try { const actor = await getSessionActor(event); const id = getRouterParam(event, 'id'); const student = id ? await prisma.studentProfile.findFirst({ where: { id, ...(actor.role === 'STUDENT' ? { userId: actor.userId } : actor.role === 'LECTURER' ? { enrollments: { some: { coopTerm: { isActive: true } } } } : {}) }, include: { user: { select: { id: true, email: true, status: true, lastLoginAt: true } }, enrollments: { include: { coopTerm: true, placement: { include: { currentWorkSite: { include: { organization: true } } } } } } } }) : null; if (!student) throw new DomainError('NOT_FOUND', 'Student was not found'); return student ? { ...student, capabilities: { edit: actor.role === 'ADMIN', account: actor.role === 'ADMIN' } } : student } catch (error) { return toHttpError(error, correlationId) } })
