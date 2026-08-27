import { defineEventHandler, getRouterParam } from 'h3'
import { DomainError } from '../../domain/errors'
import { requireRole } from '../../policies/authorization'
import { getCorrelationId, getSessionActor, toHttpError } from '../../utils/http'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => { const correlationId = getCorrelationId(event); try { const actor = await getSessionActor(event); requireRole(actor, 'LECTURER', 'ADMIN'); const id = getRouterParam(event, 'id'); const row = id ? await prisma.organization.findFirst({ where: { id, isActive: true }, include: { workSites: { include: { contacts: true, applications: { include: { studentTerm: { include: { student: true } } } } } }, aliases: true } }) : null; if (!row) throw new DomainError('NOT_FOUND', 'Organization was not found'); return { ...row, capabilities: { edit: actor.role === 'ADMIN', merge: actor.role === 'ADMIN' } } } catch (error) { return toHttpError(error, correlationId) } })
