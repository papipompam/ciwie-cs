import { defineEventHandler, readBody } from 'h3'
import { expenseSchema } from '../../../shared/schemas/commands'
import { runIdempotent } from '../../services/idempotency-service'
import { createExpense } from '../../services/operation-command-service'
import { getCorrelationId, getSessionActor, parseStrict, requireIdempotencyKey, toHttpError } from '../../utils/http'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const correlationId = getCorrelationId(event)
  try {
    const actor = await getSessionActor(event); const key = requireIdempotencyKey(event); const body = parseStrict(expenseSchema, await readBody(event))
    const idempotency = { actorId: actor.userId, operation: 'EXPENSE_CREATE', key }
    return await runIdempotent({ ...idempotency, request: body, work: () => createExpense(prisma, actor, { ...body, idempotency }) })
  } catch (error) { return toHttpError(error, correlationId) }
})
