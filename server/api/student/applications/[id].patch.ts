import { z } from 'zod'
import { canCreateStudentApplication, isStudentApplicationFinished, studentApplicationFormSchema, trackedApplicationStatuses } from '#shared/student-applications'
import { mockStudentApplications } from '../../../utils/mockStudentApplications'

const updateSchema = z.union([studentApplicationFormSchema.strict(), z.object({ status: z.enum(trackedApplicationStatuses) }).strict()])
const currentPrototypeStudentId = '66123456701'

export default defineEventHandler(async (event) => {
  const body = updateSchema.safeParse(await readBody(event))
  if (!body.success) throw createError({ statusCode: 400, statusMessage: 'INVALID_APPLICATION_DATA', data: body.error.flatten().fieldErrors })

  const application = mockStudentApplications.find(item => item.id === getRouterParam(event, 'id') && item.studentId === currentPrototypeStudentId)
  if (!application) throw createError({ statusCode: 404, statusMessage: 'APPLICATION_NOT_FOUND' })

  // `completed` is the legacy API value for a student's confirmed selection,
  // not completion of document review or permission to apply elsewhere.
  if (application.status === 'completed') {
    throw createError({ statusCode: 409, statusMessage: 'APPLICATION_SELECTION_LOCKED' })
  }
  if (body.data.status === 'completed') {
    if (application.status !== 'accepted') {
      throw createError({ statusCode: 409, statusMessage: 'COMPANY_ACCEPTANCE_REQUIRED' })
    }
    const selection = studentApplicationFormSchema.safeParse({ ...application, ...body.data })
    if (!selection.success) {
      throw createError({ statusCode: 400, statusMessage: 'INVALID_APPLICATION_DATA', data: selection.error.flatten().fieldErrors })
    }
  }

  const otherApplications = mockStudentApplications.filter(item => item.studentId === currentPrototypeStudentId && item.id !== application.id)
  if (!isStudentApplicationFinished(body.data.status) && !canCreateStudentApplication(otherApplications)) {
    throw createError({ statusCode: 409, statusMessage: 'APPLICATION_ALREADY_ACTIVE' })
  }
  Object.assign(application, body.data)
  application.updatedAt = new Date().toISOString()
  return application
})
