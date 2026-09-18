import { coopCycleInputSchema } from '#shared/coop-cycles'
import { coopCycleDate, cycleIdentity, mapCoopCycle } from '../../../utils/coopCycles'
import { requireUserSession } from '../../../utils/session'

export default defineEventHandler(async (event) => {
  await requireUserSession(event, ['staff'])
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'COOP_CYCLE_ID_REQUIRED' })
  const input = coopCycleInputSchema.parse(await readBody(event))
  const prisma = usePrisma()
  const current = await prisma.coopCycle.findUnique({ where: { id } })
  if (!current) throw createError({ statusCode: 404, statusMessage: 'COOP_CYCLE_NOT_FOUND' })
  const duplicate = await prisma.coopCycle.findFirst({
    where: { academicYear: input.academicYear, term: input.term, targetCohortYear: input.targetCohortYear, id: { not: id } },
    select: { id: true },
  })
  if (duplicate) throw createError({ statusCode: 409, statusMessage: 'COOP_CYCLE_ALREADY_EXISTS' })

  const cycle = await prisma.coopCycle.update({
    where: { id },
    data: {
      ...cycleIdentity(input.academicYear, input.term, input.targetCohortYear),
      academicYear: input.academicYear,
      term: input.term,
      targetCohortYear: input.targetCohortYear,
      requestStartDate: input.requestStart ? coopCycleDate(input.requestStart) : null,
      requestEndDate: input.requestEnd ? coopCycleDate(input.requestEnd) : null,
      trainingStartDate: input.trainingStart ? coopCycleDate(input.trainingStart) : null,
      trainingEndDate: input.trainingEnd ? coopCycleDate(input.trainingEnd) : null,
    },
  })
  return mapCoopCycle(cycle)
})
