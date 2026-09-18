import { coopCycleInputSchema } from '#shared/coop-cycles'
import { coopCycleDate, cycleIdentity, mapCoopCycle } from '../../utils/coopCycles'
import { requireUserSession } from '../../utils/session'

export default defineEventHandler(async (event) => {
  await requireUserSession(event, ['staff'])
  const input = coopCycleInputSchema.parse(await readBody(event))
  const prisma = usePrisma()
  const duplicate = await prisma.coopCycle.findFirst({
    where: { academicYear: input.academicYear, term: input.term, targetCohortYear: input.targetCohortYear },
    select: { id: true },
  })
  if (duplicate) throw createError({ statusCode: 409, statusMessage: 'COOP_CYCLE_ALREADY_EXISTS' })

  const identity = cycleIdentity(input.academicYear, input.term, input.targetCohortYear)
  const cycle = await prisma.coopCycle.create({
    data: {
      ...identity,
      academicYear: input.academicYear,
      term: input.term,
      targetCohortYear: input.targetCohortYear,
      requestStartDate: input.requestStart ? coopCycleDate(input.requestStart) : null,
      requestEndDate: input.requestEnd ? coopCycleDate(input.requestEnd) : null,
      trainingStartDate: input.trainingStart ? coopCycleDate(input.trainingStart) : null,
      trainingEndDate: input.trainingEnd ? coopCycleDate(input.trainingEnd) : null,
      status: 'OPEN_FOR_REQUESTS',
    },
  })
  return mapCoopCycle(cycle)
})
