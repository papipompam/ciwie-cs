import { academicTermLabels, coopCycleSchema, type AcademicTerm, type CoopCycleStatus } from '#shared/coop-cycles'
import type { CoopCycleStatus as PrismaCoopCycleStatus } from '@prisma/client'

export const coopCycleStatusToApi = {
  DRAFT: 'open',
  OPEN_FOR_REQUESTS: 'open',
  CLOSED_TO_REQUESTS: 'closed_to_requests',
  TRAINING: 'training',
  CLOSED: 'closed',
} as const satisfies Record<PrismaCoopCycleStatus, CoopCycleStatus>

export const coopCycleStatusToDatabase = {
  open: 'OPEN_FOR_REQUESTS',
  closed_to_requests: 'CLOSED_TO_REQUESTS',
  training: 'TRAINING',
  closed: 'CLOSED',
} as const

export const coopCycleDate = (value: string) => new Date(`${value}T00:00:00.000Z`)
const dateString = (value: Date | null) => value?.toISOString().slice(0, 10)

export const mapCoopCycle = (record: {
  id: string
  code: string
  label: string
  academicYear: number
  term: AcademicTerm
  termLabel: string
  targetCohortYear: number
  requestStartDate: Date | null
  requestEndDate: Date | null
  trainingStartDate: Date | null
  trainingEndDate: Date | null
  status: keyof typeof coopCycleStatusToApi
}) => coopCycleSchema.parse({
  id: record.id,
  code: record.code,
  label: record.label,
  academicYear: record.academicYear,
  term: record.term,
  semester: record.termLabel,
  targetCohortYear: record.targetCohortYear,
  cohort: `รุ่น ${String(record.targetCohortYear).slice(-2)}`,
  requestStart: dateString(record.requestStartDate),
  requestEnd: dateString(record.requestEndDate),
  trainingStart: dateString(record.trainingStartDate),
  trainingEnd: dateString(record.trainingEndDate),
  status: coopCycleStatusToApi[record.status],
})

export const cycleIdentity = (academicYear: number, term: AcademicTerm, targetCohortYear: number) => ({
  code: `${academicYear}-${term}-${targetCohortYear}`,
  label: `${academicTermLabels[term]}/${academicYear}`,
  termLabel: academicTermLabels[term],
})
