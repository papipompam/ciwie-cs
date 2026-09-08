import { canCreateStudentApplication, createStudentApplicationSchema, type StudentApplicationRecord } from '#shared/student-applications'
import { mockStudentApplications } from '../../utils/mockStudentApplications'

const currentPrototypeStudentId = '66123456701'

export default defineEventHandler(async (event) => {
  const parsed = createStudentApplicationSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'INVALID_APPLICATION_DATA', data: parsed.error.flatten().fieldErrors })
  }

  const ownApplications = mockStudentApplications.filter(item => item.studentId === currentPrototypeStudentId)
  if (!canCreateStudentApplication(ownApplications)) {
    throw createError({
      statusCode: 409,
      statusMessage: 'APPLICATION_ALREADY_ACTIVE',
      message: 'มีบริษัทที่กำลังดำเนินการหรือยืนยันเลือกแล้ว กรอกใหม่ได้เมื่อบริษัทเดิมปฏิเสธเท่านั้น',
    })
  }

  const now = new Date()
  const application: StudentApplicationRecord = {
    id: `APP-${Date.now()}`,
    studentId: currentPrototypeStudentId,
    ...parsed.data,
    province: 'ไม่ระบุ',
    appliedAt: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now),
    status: 'submitted',
    updatedAt: now.toISOString(),
  }
  mockStudentApplications.unshift(application)
  setResponseStatus(event, 201)
  return application
})
