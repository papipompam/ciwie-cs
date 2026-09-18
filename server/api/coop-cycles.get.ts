import { coopCyclesResponseSchema, sortCoopCycles } from '#shared/coop-cycles'
import { requireUserSession } from '../utils/session'
import { mapCoopCycle } from '../utils/coopCycles'

export default defineEventHandler(async (event) => {
  await requireUserSession(event)
  const records = await usePrisma().coopCycle.findMany({
    select: {
      id: true, code: true, label: true, academicYear: true, term: true, termLabel: true,
      targetCohortYear: true, requestStartDate: true, requestEndDate: true,
      trainingStartDate: true, trainingEndDate: true, status: true,
    },
    orderBy: [{ academicYear: 'desc' }, { requestStartDate: 'desc' }, { id: 'desc' }],
    take: 500,
  })
  return coopCyclesResponseSchema.parse({
    cycles: sortCoopCycles(records.map(mapCoopCycle)),
  })
})
