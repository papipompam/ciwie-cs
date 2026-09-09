import { Prisma } from '@prisma/client'
import { lecturerPersonPrefixes, personAccountActionSchema, personInputSchema, studentPersonPrefixes } from '#shared/people'
import { hashPassword } from '../../../utils/password'
import { personAuditSelect, personSelect, toPersonRecord } from '../../../utils/people'
import { requireUserSession } from '../../../utils/session'

export default defineEventHandler(async (event) => {
  const staff = await requireUserSession(event, ['staff'])
  const username = getRouterParam(event, 'id')
  if (!username) throw createError({ statusCode: 400, statusMessage: 'PERSON_ID_REQUIRED' })
  const raw = await readBody(event)
  const details = personInputSchema.safeParse(raw)
  const accountAction = personAccountActionSchema.safeParse(raw)
  if (!details.success && !accountAction.success) throw createError({ statusCode: 400, statusMessage: 'PERSON_INVALID' })
  const prisma = usePrisma()
  const current = await prisma.user.findUnique({
    where: { username }, select: { id: true, username: true, role: true, status: true, recordStatus: true },
  })
  if (!current || current.role === 'STAFF') throw createError({ statusCode: 404, statusMessage: 'PERSON_NOT_FOUND' })
  if (details.success && current.role === 'STUDENT' && !details.data.section) {
    throw createError({ statusCode: 400, statusMessage: 'STUDENT_SECTION_REQUIRED' })
  }
  if (details.success && current.role === 'LECTURER' && !details.data.gender) {
    throw createError({ statusCode: 400, statusMessage: 'LECTURER_GENDER_REQUIRED' })
  }
  if (details.success) {
    const allowedPrefixes: readonly string[] = current.role === 'STUDENT' ? studentPersonPrefixes : lecturerPersonPrefixes
    if (!allowedPrefixes.includes(details.data.prefix)) throw createError({ statusCode: 400, statusMessage: 'PERSON_PREFIX_INVALID' })
  }
  const duplicate = details.success && details.data.id !== current.username
    ? await prisma.user.findUnique({ where: { username: details.data.id }, select: { id: true } })
    : null
  if (duplicate) throw createError({ statusCode: 409, statusMessage: 'PERSON_USERNAME_EXISTS' })

  const person = await prisma.$transaction(async (transaction) => {
    let action = 'แก้ไขข้อมูลบุคคล'
    let detail = ''
    if (details.success) {
      const input = details.data
      const cycle = current.role === 'STUDENT' && input.cycle
        ? await transaction.coopCycle.findFirst({ where: { label: input.cycle }, select: { id: true, targetCohortYear: true } })
        : null
      if (current.role === 'STUDENT' && input.cycle && !cycle) throw createError({ statusCode: 400, statusMessage: 'COOP_CYCLE_NOT_FOUND' })
      await transaction.user.update({
        where: { id: current.id },
        data: {
          username: input.id, namePrefix: input.prefix, firstName: input.firstName, lastName: input.lastName,
          gender: input.gender === 'male' ? 'MALE' : input.gender === 'female' ? 'FEMALE' : null,
          section: current.role === 'STUDENT' ? input.section?.replace('หมู่ ', '') : null,
        },
      })
      if (current.role === 'STUDENT' && cycle) {
        await transaction.cycleEnrollment.updateMany({
          where: { studentId: current.id, enrollmentStatus: 'ACTIVE', cycleId: { not: cycle.id } },
          data: {
            enrollmentStatus: 'TRANSFERRED_OUT', currentStudentKey: null, exitedAt: new Date(),
            exitReason: `ย้ายรอบสหกิจโดย ${staff.username}`,
          },
        })
        await transaction.cycleEnrollment.upsert({
          where: { cycleId_studentId: { cycleId: cycle.id, studentId: current.id } },
          update: { enrollmentStatus: 'ACTIVE', sectionSnapshot: input.section?.replace('หมู่ ', ''), currentStudentKey: current.id },
          create: {
            cycleId: cycle.id, studentId: current.id, cohortYearSnapshot: cycle.targetCohortYear,
            sectionSnapshot: input.section?.replace('หมู่ ', ''), currentStudentKey: current.id, createdById: staff.id,
          },
        })
      }
      detail = `แก้ไขข้อมูล ${current.username}`
    }
    else if (accountAction.success) {
      const input = accountAction.data
      if (input.action === 'reset-password') {
        await transaction.user.update({
          where: { id: current.id }, data: { passwordHash: await hashPassword(input.temporaryPassword), status: 'FIRST_LOGIN', sessionVersion: { increment: 1 } },
        })
        action = 'รีเซ็ตรหัสผ่าน'; detail = 'ยกเลิก Session เดิมและบังคับเปลี่ยนรหัสผ่าน'
      }
      else {
        const state = {
          suspend: { status: 'SUSPENDED' as const, recordStatus: current.recordStatus },
          activate: { status: 'ACTIVE' as const, recordStatus: current.recordStatus },
          terminate: { status: 'TERMINATED' as const, recordStatus: 'INACTIVE' as const },
          restore: { status: 'ACTIVE' as const, recordStatus: 'ACTIVE' as const },
        }[input.action]
        await transaction.user.update({ where: { id: current.id }, data: { ...state, sessionVersion: { increment: 1 } } })
        action = { suspend: 'ระงับบัญชีชั่วคราว', activate: 'เปิดใช้งานบัญชี', terminate: 'ยุติการใช้งานข้อมูล', restore: 'เปิดใช้งานข้อมูลอีกครั้ง' }[input.action]
        detail = 'ปรับสถานะบัญชีและยกเลิก Session เดิม'
      }
    }
    await transaction.auditLog.create({
      data: { actorAccountId: staff.id, action, entityType: 'User', entityId: current.id, metadata: { detail } },
    })
    const person = await transaction.user.findUniqueOrThrow({ where: { id: current.id }, select: personSelect })
    const logs = await transaction.auditLog.findMany({
      where: { entityType: 'User', entityId: current.id }, select: personAuditSelect, orderBy: { occurredAt: 'desc' }, take: 100,
    })
    return { person, logs }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  return toPersonRecord(person.person, person.logs)
})
