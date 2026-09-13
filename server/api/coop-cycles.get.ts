import { coopCyclesResponseSchema, sortCoopCycles } from '../../shared/coop-cycles'
import { requireUserSession } from '../utils/session'

const statusMap = {
  DRAFT: 'draft',
  OPEN_FOR_REQUESTS: 'open',
  CLOSED_TO_REQUESTS: 'closed_to_requests',
  TRAINING: 'training',
  CLOSED: 'closed',
} as const

const date = (value: Date) => value.toISOString().slice(0, 10)

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
    cycles: sortCoopCycles(records.map(record => ({
      id: record.id,
      code: record.code,
      label: record.label,
      academicYear: record.academicYear,
      semester: record.termLabel,
      cohort: `รุ่น ${String(record.targetCohortYear).slice(-2)}`,
      requestStart: date(record.requestStartDate),
      requestEnd: date(record.requestEndDate),
      trainingStart: date(record.trainingStartDate),
      trainingEnd: date(record.trainingEndDate),
      status: statusMap[record.status],
      term: record.term,
    }))).map(({ term: _term, ...cycle }) => cycle),
  })
})
