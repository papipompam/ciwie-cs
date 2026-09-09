import { lecturerStudentNameSchema } from '#shared/people'
import { personAuditSelect, personSelect, toPersonRecord } from '../../utils/people'
import { requireUserSession } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const lecturer = await requireUserSession(event, ['lecturer'])
  const username = getRouterParam(event, 'id')
  if (!username) throw createError({ statusCode: 400, statusMessage: 'PERSON_ID_REQUIRED' })
  const parsed = lecturerStudentNameSchema.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'PERSON_INVALID' })
  const prisma = usePrisma()
  const student = await prisma.user.findFirst({ where: { username, role: 'STUDENT' }, select: { id: true } })
  if (!student) throw createError({ statusCode: 404, statusMessage: 'PERSON_NOT_FOUND' })
  const person = await prisma.$transaction(async (transaction) => {
    await transaction.user.update({
      where: { id: student.id },
      data: { namePrefix: parsed.data.prefix, firstName: parsed.data.firstName, lastName: parsed.data.lastName },
    })
    await transaction.auditLog.create({
      data: {
        actorAccountId: lecturer.id, action: 'แก้ไขชื่อโดยอาจารย์', entityType: 'User', entityId: student.id,
        metadata: { detail: 'แก้ไขคำนำหน้า ชื่อ หรือนามสกุลนักศึกษา' },
      },
    })
    const updated = await transaction.user.findUniqueOrThrow({ where: { id: student.id }, select: personSelect })
    const logs = await transaction.auditLog.findMany({
      where: { entityType: 'User', entityId: student.id }, select: personAuditSelect, orderBy: { occurredAt: 'desc' }, take: 100,
    })
    return { updated, logs }
  })
  return toPersonRecord(person.updated, person.logs)
})
