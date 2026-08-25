import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { expenseCorrectionSchema } from '../../../../shared/schemas/commands'
import { DomainError } from '../../../domain/errors'
import { runIdempotent } from '../../../services/idempotency-service'
import { correctExpense } from '../../../services/operation-command-service'
import { getCorrelationId, getSessionActor, parseStrict, requireIdempotencyKey, toHttpError } from '../../../utils/http'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const correlationId = getCorrelationId(event)
  try {
    const actor = await getSessionActor(event)
    const expenseId = getRouterParam(event, 'id')
    if (!expenseId) throw new DomainError('BAD_REQUEST', 'Expense id is required')
    const key = requireIdempotencyKey(event)
    const body = parseStrict(expenseCorrectionSchema, await readBody(event))
    const idempotency = { actorId: actor.userId, operation: 'EXPENSE_CORRECT', key }
    return await runIdempotent({ ...idempotency, request: { expenseId, ...body }, work: () => correctExpense(prisma, actor, { expenseId, ...body, idempotency }) })
  } catch (error) {
    return toHttpError(error, correlationId)
  }
})
