import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { studentImportConfirmSchema } from '../../../../shared/schemas/import-export'
import { DomainError } from '../../../domain/errors'
import { confirmStudentImport } from '../../../services/student-import-service'
import { getCorrelationId, getSessionActor, parseStrict, requireIdempotencyKey, toHttpError } from '../../../utils/http'
import { prisma } from '../../../utils/prisma'
import { runIdempotent } from '../../../services/idempotency-service'

export default defineEventHandler(async (event) => { const correlationId = getCorrelationId(event); try { const importId = getRouterParam(event, 'id'); if (!importId) throw new DomainError('BAD_REQUEST', 'Import id is required'); const actor = await getSessionActor(event); const body = parseStrict(studentImportConfirmSchema, await readBody(event)); const key = requireIdempotencyKey(event); return await runIdempotent({ actorId: actor.userId, operation: 'STUDENT_IMPORT_CONFIRM', key, request: { importId, ...body }, work: () => confirmStudentImport(prisma, actor, { importId, ...body }) }) } catch (error) { return toHttpError(error, correlationId) } })
