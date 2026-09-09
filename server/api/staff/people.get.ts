import { z } from 'zod'
import { personTypeSchema } from '#shared/people'
import { personAuditSelect, personSelect, toPersonRecord } from '../../utils/people'
import { requireUserSession } from '../../utils/session'

const querySchema = z.object({ type: personTypeSchema }).strict()

export default defineEventHandler(async (event) => {
  await requireUserSession(event, ['staff'])
  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'PERSON_TYPE_INVALID' })
  const prisma = usePrisma()
  const people = await prisma.user.findMany({
    where: { role: parsed.data.type === 'student' ? 'STUDENT' : 'LECTURER' },
    select: personSelect,
    orderBy: [{ recordStatus: 'asc' }, { firstName: 'asc' }, { lastName: 'asc' }],
    take: 10_001,
  })
  if (people.length > 10_000) throw createError({ statusCode: 422, statusMessage: 'PEOPLE_TOO_LARGE' })
  const logs = people.length ? await prisma.auditLog.findMany({
    where: { entityType: 'User', entityId: { in: people.map(person => person.id) } },
    select: personAuditSelect,
    orderBy: { occurredAt: 'desc' },
    take: Math.min(people.length * 100, 50_000),
  }) : []
  return { people: people.map(person => toPersonRecord(person, logs.filter(log => log.entityId === person.id))) }
})
