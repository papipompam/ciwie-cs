import { mockStudentApplications } from '../../../utils/mockStudentApplications'

export default defineEventHandler((event) => {
  const index = mockStudentApplications.findIndex(item => item.id === getRouterParam(event, 'id') && item.studentId === '66123456701')
  if (index < 0) throw createError({ statusCode: 404, statusMessage: 'APPLICATION_NOT_FOUND' })
  if (mockStudentApplications[index]?.status !== 'rejected') {
    throw createError({ statusCode: 409, statusMessage: 'APPLICATION_CANNOT_DELETE_ACTIVE' })
  }
  mockStudentApplications.splice(index, 1)
  setResponseStatus(event, 204)
})
