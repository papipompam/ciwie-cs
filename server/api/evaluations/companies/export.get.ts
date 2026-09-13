import { z } from 'zod'
import writeExcelFile from 'write-excel-file/node'
import { requireUserSession } from '../../../utils/session'
import { buildPersistedCompanyEvaluationRows } from '../../../utils/companyEvaluationExport'
import { rowsToCsv } from '../../../utils/studentEvaluationExport'

const querySchema = z.object({
  format: z.enum(['csv', 'xlsx']).default('csv'),
  cycleId: z.string().trim().min(1).max(30).optional(),
  round: z.coerce.number().int().refine(value => value === 1 || value === 2).optional(),
}).strict()

export default defineEventHandler(async (event) => {
  await requireUserSession(event, ['staff'])
  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'EVALUATION_EXPORT_QUERY_INVALID' })
  const evaluations = await usePrisma().companyEvaluation.findMany({
    where: {
      status: 'SUBMITTED',
      ...(parsed.data.cycleId || parsed.data.round ? {
        appointment: { groupCompany: { group: {
          ...(parsed.data.cycleId ? { cycleId: parsed.data.cycleId } : {}),
          ...(parsed.data.round ? { round: parsed.data.round === 1 ? 'ROUND_1' as const : 'ROUND_2' as const } : {}),
        } } },
      } : {}),
    },
    select: {
      workRelevanceScore: true, workChallengeScore: true, learningOpportunityScore: true, supervisorReadinessScore: true,
      studentSupportScore: true, environmentScore: true, safetyScore: true, resourceReadinessScore: true,
      allowanceScore: true, transportationScore: true, publicTransportScore: true, nearbyAccommodationScore: true, universityCoordinationScore: true,
      evaluator: { select: { namePrefix: true, firstName: true, lastName: true } },
      appointment: { select: { scheduledDate: true, groupCompany: { select: { companySite: { select: { company: { select: { legalName: true } } } } } } } },
    },
    orderBy: [{ appointment: { scheduledDate: 'asc' } }, { id: 'asc' }],
    take: 10_001,
  })
  if (evaluations.length > 10_000) throw createError({ statusCode: 422, statusMessage: 'EVALUATION_EXPORT_TOO_LARGE' })
  const rows = buildPersistedCompanyEvaluationRows(evaluations)
  if (!rows.length) throw createError({ statusCode: 404, statusMessage: 'EVALUATION_EXPORT_EMPTY' })
  const extension = parsed.data.format
  const date = new Date().toISOString().slice(0, 10)
  setResponseHeader(event, 'content-disposition', `attachment; filename="company-evaluation-scores-${date}.${extension}"`)
  setResponseHeader(event, 'x-export-count', String(rows.length))
  if (extension === 'csv') {
    setResponseHeader(event, 'content-type', 'text/csv; charset=utf-8')
    return Buffer.from(rowsToCsv(rows), 'utf8')
  }
  const headers = Object.keys(rows[0]!)
  const matrix = [headers, ...rows.map(row => headers.map(header => row[header] ?? ''))]
  const workbook = await writeExcelFile(matrix.map(row => row.map(value => typeof value === 'number' ? { value, type: Number } : { value, type: String }))).toBuffer()
  setResponseHeader(event, 'content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  return workbook
})
