import { z } from 'zod'
import writeExcelFile from 'write-excel-file/node'
import { requireUserSession } from '../../../utils/session'
import { buildPersistedStudentEvaluationRows, rowsToCsv } from '../../../utils/studentEvaluationExport'

const querySchema = z.object({
  format: z.enum(['csv', 'xlsx']).default('csv'),
  cycleId: z.string().trim().min(1).max(30).optional(),
  round: z.coerce.number().int().refine(value => value === 1 || value === 2).optional(),
}).strict()

export default defineEventHandler(async (event) => {
  const user = await requireUserSession(event, ['staff', 'lecturer'])
  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'EVALUATION_EXPORT_QUERY_INVALID' })
  const evaluations = await usePrisma().studentEvaluation.findMany({
    where: {
      status: 'SUBMITTED',
      ...(user.role === 'lecturer' ? { evaluatorLecturerId: user.id } : {}),
      ...(parsed.data.cycleId || parsed.data.round
        ? {
            appointmentStudent: {
              appointment: {
                groupCompany: {
                  group: {
                    ...(parsed.data.cycleId ? { cycleId: parsed.data.cycleId } : {}),
                    ...(parsed.data.round ? { round: parsed.data.round === 1 ? 'ROUND_1' as const : 'ROUND_2' as const } : {}),
                  },
                },
              },
            },
          }
        : {}),
    },
    select: {
      responsibilityScore: true,
      disciplineScore: true,
      communicationScore: true,
      knowledgeScore: true,
      workQualityScore: true,
      problemSolvingScore: true,
      appointmentStudent: {
        select: {
          placementRequest: {
            select: {
              companyNameSnapshot: true,
              positionTitle: true,
              enrollment: { select: { student: { select: { namePrefix: true, firstName: true, lastName: true } } } },
            },
          },
        },
      },
    },
    orderBy: [{ appointmentStudent: { placementRequest: { enrollment: { student: { username: 'asc' } } } } }, { id: 'asc' }],
    take: 10_001,
  })
  if (evaluations.length > 10_000) throw createError({ statusCode: 422, statusMessage: 'EVALUATION_EXPORT_TOO_LARGE' })
  const rows = buildPersistedStudentEvaluationRows(evaluations)
  if (!rows.length) throw createError({ statusCode: 404, statusMessage: 'EVALUATION_EXPORT_EMPTY' })
  const date = new Date().toISOString().slice(0, 10)
  const extension = parsed.data.format
  setResponseHeader(event, 'content-disposition', `attachment; filename="student-evaluation-scores-${date}.${extension}"`)
  setResponseHeader(event, 'x-export-count', String(rows.length))
  if (parsed.data.format === 'csv') {
    setResponseHeader(event, 'content-type', 'text/csv; charset=utf-8')
    return Buffer.from(rowsToCsv(rows), 'utf8')
  }
  const headers = Object.keys(rows[0]!)
  const matrix = [headers, ...rows.map(row => headers.map(header => row[header] ?? ''))]
  const workbook = await writeExcelFile(matrix.map(row => row.map(value => typeof value === 'number'
    ? { value, type: Number }
    : { value, type: String }))).toBuffer()
  setResponseHeader(event, 'content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  return workbook
})
