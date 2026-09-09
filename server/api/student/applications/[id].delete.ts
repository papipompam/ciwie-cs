import { requireUserSession } from '../../../utils/session'

export default defineEventHandler(async (event) => {
  const user = await requireUserSession(event, ['student'])
  const application = await usePrisma().studentApplication.findFirst({
    where: { id: getRouterParam(event, 'id'), enrollment: { studentId: user.id } },
    select: { id: true, status: true },
  })
  if (!application) throw createError({ statusCode: 404, statusMessage: 'APPLICATION_NOT_FOUND' })
  if (application.status !== 'REJECTED') {
    throw createError({ statusCode: 409, statusMessage: 'APPLICATION_CANNOT_DELETE_ACTIVE' })
  }
  const result = await usePrisma().studentApplication.deleteMany({
    where: { id: application.id, status: 'REJECTED', enrollment: { studentId: user.id } },
  })
  if (result.count !== 1) throw createError({ statusCode: 409, statusMessage: 'APPLICATION_CANNOT_DELETE_ACTIVE' })
  setResponseStatus(event, 204)
})
