import { coopCycleStatusInputSchema } from '#shared/coop-cycles'
import { coopCycleStatusToDatabase, mapCoopCycle } from '../../../../utils/coopCycles'
import { requireUserSession } from '../../../../utils/session'

export default defineEventHandler(async (event) => {
  const staff = await requireUserSession(event, ['staff'])
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'COOP_CYCLE_ID_REQUIRED' })
  const input = coopCycleStatusInputSchema.parse(await readBody(event))

  const cycle = await usePrisma().$transaction(async (transaction) => {
    const current = await transaction.coopCycle.findUnique({ where: { id } })
    if (!current) throw createError({ statusCode: 404, statusMessage: 'COOP_CYCLE_NOT_FOUND' })
    const requested = coopCycleStatusToDatabase[input.status]
    if (current.status === requested) throw createError({ statusCode: 409, statusMessage: 'COOP_CYCLE_STATUS_UNCHANGED' })

    const updated = await transaction.coopCycle.update({
      where: { id },
      data: { status: requested, closedAt: requested === 'CLOSED' ? new Date() : null },
    })
    await transaction.coopCycleStatusHistory.create({
      data: { cycleId: id, fromStatus: current.status, toStatus: requested, reason: input.reason || 'เปลี่ยนสถานะโดยเจ้าหน้าที่', changedById: staff.id },
    })
    return updated
  })
  return mapCoopCycle(cycle)
})
