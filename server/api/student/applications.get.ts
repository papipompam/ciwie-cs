import { requireUserSession } from '../../utils/session'
import { toStudentApplicationRecord } from '../../utils/studentApplications'
import { z } from 'zod'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(100),
})

export default defineEventHandler(async (event) => {
  const user = await requireUserSession(event, ['student'])
  const query = querySchema.safeParse(getQuery(event))
  if (!query.success) throw createError({ statusCode: 400, statusMessage: 'INVALID_PAGINATION' })
  const where = { enrollment: { studentId: user.id } }
  const [applications, total] = await usePrisma().$transaction([
    usePrisma().studentApplication.findMany({
      where,
      include: { placementRequest: { select: { id: true } } },
      orderBy: [{ appliedDate: 'desc' }, { updatedAt: 'desc' }, { id: 'desc' }],
      skip: (query.data.page - 1) * query.data.pageSize,
      take: query.data.pageSize,
    }),
    usePrisma().studentApplication.count({ where }),
  ])
  setResponseHeaders(event, {
    'x-total-count': String(total),
    'x-page': String(query.data.page),
    'x-page-size': String(query.data.pageSize),
  })
  return applications.map(application => toStudentApplicationRecord(application, user.username, application.placementRequest?.id))
})
