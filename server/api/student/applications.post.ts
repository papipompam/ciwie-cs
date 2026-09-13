import { Prisma } from '@prisma/client'
import { createStudentApplicationSchema } from '#shared/student-applications'
import { requireUserSession } from '../../utils/session'
import { bangkokCalendarDate, getActiveEnrollment, toStudentApplicationRecord } from '../../utils/studentApplications'

const nextApplicationId = async (prisma: ReturnType<typeof usePrisma>) => {
  const records = await prisma.studentApplication.findMany({ where: { id: { startsWith: 'RE' } }, select: { id: true } })
  const used = new Set(records.map(record => record.id))
  for (let number = 1; number <= 9999; number += 1) {
    const id = `RE${String(number).padStart(4, '0')}`
    if (!used.has(id)) return id
  }
  throw createError({ statusCode: 409, statusMessage: 'APPLICATION_NUMBER_EXHAUSTED' })
}

export default defineEventHandler(async (event) => {
  const parsed = createStudentApplicationSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'INVALID_APPLICATION_DATA', data: parsed.error.flatten().fieldErrors })
  }

  const user = await requireUserSession(event, ['student'])
  const enrollment = await getActiveEnrollment(user.id)
  const prisma = usePrisma()
  try {
    const application = await prisma.studentApplication.create({
      data: {
        id: await nextApplicationId(prisma),
        enrollmentId: enrollment.id,
        companyNameSnapshot: parsed.data.companyName,
        companyLocation: parsed.data.companyLocation,
        recipientNameSnapshot: parsed.data.recipientName,
        letterAddressSnapshot: parsed.data.letterAddress,
        latitude: parsed.data.latitude,
        longitude: parsed.data.longitude,
        provinceSnapshot: parsed.data.province,
        positionTitle: parsed.data.position,
        appliedDate: bangkokCalendarDate(),
        status: 'SUBMITTED',
        activeSlotKey: enrollment.id,
      },
    })
    setResponseStatus(event, 201)
    return toStudentApplicationRecord(application, user.username)
  }
  catch (cause) {
    if (cause instanceof Prisma.PrismaClientKnownRequestError && cause.code === 'P2002') {
      throw createError({
        statusCode: 409,
        statusMessage: 'APPLICATION_ALREADY_ACTIVE',
        message: 'มีบริษัทที่กำลังดำเนินการหรือยืนยันเลือกแล้ว กรอกใหม่ได้เมื่อบริษัทเดิมปฏิเสธเท่านั้น',
      })
    }
    throw cause
  }
})
