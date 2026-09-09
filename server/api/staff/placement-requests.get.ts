import { z } from 'zod'
import { requireUserSession } from '../../utils/session'
import { toPlacementRequestPreview } from '../../utils/placementRequests'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(100),
  cycleId: z.string().trim().min(1).max(30).optional(),
})

export default defineEventHandler(async (event) => {
  await requireUserSession(event, ['staff'])
  const query = querySchema.safeParse(getQuery(event))
  if (!query.success) throw createError({ statusCode: 400, statusMessage: 'INVALID_PAGINATION' })

  const prisma = usePrisma()
  const where = {
    status: { not: 'DRAFT' as const },
    ...(query.data.cycleId ? { enrollment: { cycleId: query.data.cycleId } } : {}),
  }
  const [requests, total] = await prisma.$transaction([
    prisma.placementRequest.findMany({
      where,
      include: {
        studentApplication: { select: { id: true, appliedDate: true } },
        enrollment: { select: { cycleId: true, student: { select: { username: true, namePrefix: true, firstName: true, lastName: true } } } },
        documents: { where: { status: 'ACTIVE' }, select: { id: true, documentType: true, originalFileName: true } },
      },
      orderBy: [{ submittedAt: 'desc' }, { id: 'desc' }],
      skip: (query.data.page - 1) * query.data.pageSize,
      take: query.data.pageSize,
    }),
    prisma.placementRequest.count({ where }),
  ])
  setResponseHeaders(event, {
    'x-total-count': String(total),
    'x-page': String(query.data.page),
    'x-page-size': String(query.data.pageSize),
  })
  return requests.map(toPlacementRequestPreview)
})
