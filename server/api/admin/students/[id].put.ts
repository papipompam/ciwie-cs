import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { studentProfileAdminUpdateSchema } from '../../../../shared/schemas/admin-identity'
import { DomainError } from '../../../domain/errors'
import { updateStudentProfileByAdmin } from '../../../services/admin-identity-service'
import { getCorrelationId, getSessionActor, parseStrict, toHttpError } from '../../../utils/http'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const correlationId = getCorrelationId(event)
  try {
    const id = getRouterParam(event, 'id')
    if (!id) throw new DomainError('BAD_REQUEST', 'Student id is required')
    return await updateStudentProfileByAdmin(prisma, await getSessionActor(event), id, parseStrict(studentProfileAdminUpdateSchema, await readBody(event)))
  } catch (error) { return toHttpError(error, correlationId) }
})
