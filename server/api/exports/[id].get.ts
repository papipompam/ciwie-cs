import { defineEventHandler, getRouterParam } from 'h3'
import { DomainError } from '../../domain/errors'
import { getCorrelationId, getSessionActor, toHttpError } from '../../utils/http'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => { const correlationId = getCorrelationId(event); try { const actor = await getSessionActor(event); const id = getRouterParam(event, 'id'); const job = id ? await prisma.exportJob.findFirst({ where: { id, ...(actor.role === 'ADMIN' ? {} : { requestedById: actor.userId }) }, select: { id: true, status: true, failureReason: true, expiresAt: true, fileVersionId: true } }) : null; if (!job) throw new DomainError('NOT_FOUND', 'Export job was not found'); return job } catch (error) { return toHttpError(error, correlationId) } })
