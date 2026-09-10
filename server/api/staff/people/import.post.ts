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
  let created = 0
  let updated = 0
  const prisma = usePrisma()

  await prisma.$transaction(async (transaction) => {
    for (const person of people) {
      const existing = await transaction.user.findUnique({ where: { username: person.id }, select: { id: true, role: true } })
      if (existing) {
        duplicates.push(person.id)
        if (existing.role === role) {
          await transaction.user.update({
            where: { id: existing.id },
            data: { namePrefix: person.prefix, firstName: person.firstName, lastName: person.lastName },
          })
          updated += 1
        }
        continue
      }

      const temporaryPassword = generateTemporaryPassword()
      const account = await transaction.user.create({
        data: {
          username: person.id,
          passwordHash: await hashPassword(temporaryPassword),
          role,
          status: 'FIRST_LOGIN',
          namePrefix: person.prefix,
          firstName: person.firstName,
          lastName: person.lastName,
          gender: person.gender === 'male' ? 'MALE' : person.gender === 'female' ? 'FEMALE' : null,
          section: type === 'student' ? person.section?.replace('หมู่ ', '') : null,
          cohortYear: type === 'student' ? getCohortYear(person.id) : null,
          createdById: staff.id,
        },
        select: { id: true },
      })
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
