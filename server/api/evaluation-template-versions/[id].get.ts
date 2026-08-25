import { defineEventHandler, getRouterParam } from 'h3'
import { DomainError } from '../../domain/errors'
import { requireRole } from '../../policies/authorization'
import { getCorrelationId, getSessionActor, toHttpError } from '../../utils/http'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => { const correlationId = getCorrelationId(event); try { const actor = await getSessionActor(event); requireRole(actor, 'LECTURER', 'ADMIN'); const id = getRouterParam(event, 'id'); const template = id ? await prisma.evaluationTemplateVersion.findUnique({ where: { id }, include: { template: true, items: { orderBy: { sortOrder: 'asc' } } } }) : null; if (!template) throw new DomainError('NOT_FOUND', 'Template version was not found'); return template } catch (error) { return toHttpError(error, correlationId) } })
