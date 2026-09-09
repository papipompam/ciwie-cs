import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { lecturerPersonPrefixes, personInputSchema, personTypeSchema, studentPersonPrefixes } from '#shared/people'
import { hashPassword } from '../../utils/password'
import { personAuditSelect, personSelect, toPersonRecord } from '../../utils/people'
import { requireUserSession } from '../../utils/session'

const createSchema = personInputSchema.extend({ type: personTypeSchema })

export default defineEventHandler(async (event) => {
  const staff = await requireUserSession(event, ['staff'])
  const parsed = createSchema.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'PERSON_INVALID' })
  const input = parsed.data
  if (input.type === 'student' && !input.section) throw createError({ statusCode: 400, statusMessage: 'STUDENT_SECTION_REQUIRED' })
  if (input.type === 'lecturer' && !input.gender) throw createError({ statusCode: 400, statusMessage: 'LECTURER_GENDER_REQUIRED' })
  const allowedPrefixes: readonly string[] = input.type === 'student' ? studentPersonPrefixes : lecturerPersonPrefixes
  if (!allowedPrefixes.includes(input.prefix)) throw createError({ statusCode: 400, statusMessage: 'PERSON_PREFIX_INVALID' })
  const config = useRuntimeConfig(event)
  const initialPassword = z.string().min(8).safeParse(config.initialAccountPassword)
  if (!initialPassword.success) throw createError({ statusCode: 500, statusMessage: 'INITIAL_ACCOUNT_PASSWORD_NOT_CONFIGURED' })
  const passwordHash = await hashPassword(initialPassword.data)
  const prisma = usePrisma()
  if (await prisma.user.findUnique({ where: { username: input.id }, select: { id: true } })) {
    throw createError({ statusCode: 409, statusMessage: 'PERSON_USERNAME_EXISTS' })
  }
  const cycle = input.type === 'student' && input.cycle
    ? await prisma.coopCycle.findFirst({ where: { label: input.cycle }, select: { id: true, targetCohortYear: true } })
    : null
  if (input.type === 'student' && input.cycle && !cycle) throw createError({ statusCode: 400, statusMessage: 'COOP_CYCLE_NOT_FOUND' })

  const person = await prisma.$transaction(async (transaction) => {
    const created = await transaction.user.create({
      data: {
        username: input.id, passwordHash, role: input.type === 'student' ? 'STUDENT' : 'LECTURER', status: 'FIRST_LOGIN',
        namePrefix: input.prefix, firstName: input.firstName, lastName: input.lastName,
        gender: input.gender === 'male' ? 'MALE' : input.gender === 'female' ? 'FEMALE' : null,
        section: input.type === 'student' ? input.section?.replace('หมู่ ', '') : null,
        cohortYear: input.type === 'student' ? cycle?.targetCohortYear ?? Number(`25${input.id.slice(0, 2)}`) : null,
        createdById: staff.id,
      },
      select: { id: true },
    })
    if (input.type === 'student' && cycle) {
      await transaction.cycleEnrollment.create({
        data: {
          cycleId: cycle.id, studentId: created.id, cohortYearSnapshot: cycle.targetCohortYear,
          sectionSnapshot: input.section?.replace('หมู่ ', ''), currentStudentKey: created.id, createdById: staff.id,
        },
      })
    }
    await transaction.auditLog.create({
      data: {
        actorAccountId: staff.id, action: 'สร้างข้อมูลและบัญชี', entityType: 'User', entityId: created.id,
        metadata: { detail: 'สร้างบัญชีสถานะรอเข้าสู่ระบบครั้งแรก' },
      },
    })
    const person = await transaction.user.findUniqueOrThrow({ where: { id: created.id }, select: personSelect })
    const logs = await transaction.auditLog.findMany({
      where: { entityType: 'User', entityId: created.id }, select: personAuditSelect, orderBy: { occurredAt: 'desc' }, take: 100,
    })
    return { person, logs }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  setResponseStatus(event, 201)
  return toPersonRecord(person.person, person.logs)
})
