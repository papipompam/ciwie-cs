import { Prisma } from '@prisma/client'
import { studentProfileInputSchema, studentProfileResponseSchema } from '#shared/student-profile'
import { requireUserSession } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const user = await requireUserSession(event, ['student'])
  const input = studentProfileInputSchema.safeParse(await readBody(event))
  if (!input.success) throw createError({ statusCode: 400, statusMessage: 'STUDENT_PROFILE_INVALID', data: input.error.flatten().fieldErrors })

  const profile = await usePrisma().$transaction(async (transaction) => {
    const updated = await transaction.user.update({
      where: { id: user.id },
      data: {
        namePrefix: input.data.prefix,
        firstName: input.data.firstName,
        lastName: input.data.lastName,
        section: input.data.section,
        phone: input.data.phone,
        email: input.data.email,
      },
      select: { id: true, username: true, namePrefix: true, firstName: true, lastName: true, cohortYear: true, section: true, phone: true, email: true },
    })
    await transaction.auditLog.create({
      data: {
        actorAccountId: user.id,
        action: 'แก้ไขข้อมูลพื้นฐานของตนเอง',
        entityType: 'User',
        entityId: user.id,
        metadata: { detail: 'แก้ไขคำนำหน้า ชื่อ นามสกุล หมู่เรียน โทรศัพท์ หรืออีเมล' },
      },
    })
    return updated
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

  return studentProfileResponseSchema.parse({
    profile: { id: profile.id, username: profile.username, prefix: profile.namePrefix, firstName: profile.firstName, lastName: profile.lastName, cohortYear: profile.cohortYear, section: profile.section, phone: profile.phone, email: profile.email },
  })
})
