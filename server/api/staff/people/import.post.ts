import { Prisma } from '@prisma/client'
import { lecturerPersonPrefixes, peopleImportRequestSchema, studentPersonPrefixes } from '#shared/people'
import { hashPassword } from '../../../utils/password'
import { generateTemporaryPassword } from '../../../utils/temporaryPassword'
import { requireUserSession } from '../../../utils/session'

export default defineEventHandler(async (event) => {
  const staff = await requireUserSession(event, ['staff'])
  const parsed = peopleImportRequestSchema.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'PEOPLE_IMPORT_INVALID' })

  const { type, people } = parsed.data
  const allowedPrefixes: readonly string[] = type === 'student' ? studentPersonPrefixes : lecturerPersonPrefixes
  const invalidPrefix = people.find(person => !allowedPrefixes.includes(person.prefix))
  if (invalidPrefix) throw createError({ statusCode: 400, statusMessage: 'PEOPLE_IMPORT_PREFIX_INVALID' })

  const ids = people.map(person => person.id)
  if (new Set(ids).size !== ids.length) throw createError({ statusCode: 409, statusMessage: 'PEOPLE_IMPORT_DUPLICATE_FILE' })

  const role = type === 'student' ? 'STUDENT' as const : 'LECTURER' as const
  const getCohortYear = (id: string) => /^\d{2}/.test(id) ? Number(`25${id.slice(0, 2)}`) : null
  const credentials: Array<{ username: string, name: string, temporaryPassword: string }> = []
  const duplicates: string[] = []
  const cycleCache = new Map<string, { id: string, targetCohortYear: number } | null>()
  let created = 0
  let updated = 0
  const prisma = usePrisma()

  await prisma.$transaction(async (transaction) => {
    for (const person of people) {
      let cycle: { id: string, targetCohortYear: number } | null = null
      if (type === 'student' && person.cycle) {
        if (!cycleCache.has(person.cycle)) {
          cycleCache.set(person.cycle, await transaction.coopCycle.findFirst({
            where: { OR: [{ label: person.cycle }, { code: person.cycle }] },
            select: { id: true, targetCohortYear: true },
          }))
        }
        cycle = cycleCache.get(person.cycle) ?? null
        if (!cycle) throw createError({ statusCode: 400, statusMessage: 'COOP_CYCLE_NOT_FOUND' })
      }
      const existing = await transaction.user.findUnique({ where: { username: person.id }, select: { id: true, role: true } })
      if (existing) {
        duplicates.push(person.id)
        if (existing.role === role) {
          await transaction.user.update({
            where: { id: existing.id },
            data: {
              namePrefix: person.prefix, firstName: person.firstName, lastName: person.lastName,
              ...(person.phone !== undefined ? { phone: person.phone } : {}),
              ...(person.email !== undefined ? { email: person.email } : {}),
              ...(person.gender !== undefined ? { gender: person.gender === 'male' ? 'MALE' as const : 'FEMALE' as const } : {}),
              ...(type === 'student' && person.section !== undefined ? { section: person.section.replace('หมู่ ', '') } : {}),
              ...(cycle ? { cohortYear: cycle.targetCohortYear } : {}),
            },
          })
          if (type === 'student' && cycle) {
            await transaction.cycleEnrollment.updateMany({
              where: { studentId: existing.id, enrollmentStatus: 'ACTIVE', cycleId: { not: cycle.id } },
              data: { enrollmentStatus: 'TRANSFERRED_OUT', currentStudentKey: null, exitedAt: new Date(), exitReason: `ย้ายรอบสหกิจโดย ${staff.username}` },
            })
            await transaction.cycleEnrollment.upsert({
              where: { cycleId_studentId: { cycleId: cycle.id, studentId: existing.id } },
              update: { enrollmentStatus: 'ACTIVE', sectionSnapshot: person.section?.replace('หมู่ ', '') ?? null, currentStudentKey: existing.id },
              create: {
                cycleId: cycle.id, studentId: existing.id, cohortYearSnapshot: cycle.targetCohortYear,
                sectionSnapshot: person.section?.replace('หมู่ ', ''), currentStudentKey: existing.id, createdById: staff.id,
              },
            })
          }
          updated += 1
        }
        continue
      }

      const temporaryPassword = type === 'student' ? person.id : generateTemporaryPassword()
      const account = await transaction.user.create({
        data: {
          username: person.id,
          passwordHash: await hashPassword(temporaryPassword),
          role,
          status: 'FIRST_LOGIN',
          namePrefix: person.prefix,
          firstName: person.firstName,
          lastName: person.lastName,
          phone: person.phone,
          email: person.email,
          gender: person.gender === 'male' ? 'MALE' : person.gender === 'female' ? 'FEMALE' : null,
          section: type === 'student' ? person.section?.replace('หมู่ ', '') : null,
          cohortYear: type === 'student' ? cycle?.targetCohortYear ?? getCohortYear(person.id) : null,
          createdById: staff.id,
        },
        select: { id: true },
      })
      if (type === 'student' && cycle) {
        await transaction.cycleEnrollment.create({
          data: {
            cycleId: cycle.id, studentId: account.id, cohortYearSnapshot: cycle.targetCohortYear,
            sectionSnapshot: person.section?.replace('หมู่ ', ''), currentStudentKey: account.id, createdById: staff.id,
          },
        })
      }
      await transaction.auditLog.create({
        data: {
          actorAccountId: staff.id,
          action: 'สร้างข้อมูลและบัญชี',
          entityType: 'User',
          entityId: account.id,
          metadata: { detail: 'สร้างจากการนำเข้าข้อมูล บัญชีรอเข้าสู่ระบบครั้งแรก' },
        },
      })
      credentials.push({
        username: person.id,
        name: `${person.prefix}${person.firstName} ${person.lastName}`.trim(),
        temporaryPassword,
      })
      created += 1
    }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

  return { created, updated, duplicates, credentials }
})
