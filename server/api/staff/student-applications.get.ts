import { z } from 'zod'
import { requireUserSession } from '../../utils/session'
import { toStudentApplicationRecord } from '../../utils/studentApplications'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(100),
})

export default defineEventHandler(async (event) => {
  await requireUserSession(event, ['staff'])
  const query = querySchema.safeParse(getQuery(event))
  if (!query.success) throw createError({ statusCode: 400, statusMessage: 'INVALID_PAGINATION' })
  const prisma = usePrisma()
  const [applications, total] = await prisma.$transaction([
    prisma.studentApplication.findMany({
      include: { enrollment: { select: { student: { select: { username: true } } } }, placementRequest: { select: { id: true } } },
      orderBy: [{ appliedDate: 'desc' }, { updatedAt: 'desc' }, { id: 'desc' }],
      skip: (query.data.page - 1) * query.data.pageSize,
      take: query.data.pageSize,
    }),
    prisma.studentApplication.count(),
  ])
  setResponseHeaders(event, {
    'x-total-count': String(total),
    'x-page': String(query.data.page),
    'x-page-size': String(query.data.pageSize),
  })
  return applications.map(application => toStudentApplicationRecord(application, application.enrollment.student.username, application.placementRequest?.id))
})
