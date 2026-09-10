import { hashPassword } from '../../utils/password'

export default defineEventHandler(async (_event) => {
  if (process.env.ALLOW_DEMO_SEED !== 'true') {
    throw createError({ statusCode: 404, statusMessage: 'NOT_FOUND' })
  }

  const password = process.env.SEED_DEFAULT_PASSWORD ?? 'Cwie@2569'
  const passwordHash = await hashPassword(password)
  const prisma = usePrisma()

  await prisma.user.upsert({
    where: { id: 'staff-001' },
    update: { passwordHash, status: 'ACTIVE', recordStatus: 'ACTIVE', passwordChangedAt: new Date() },
    create: { id: 'staff-001', username: 'staff001', passwordHash, role: 'STAFF', status: 'ACTIVE', namePrefix: 'นางสาว', firstName: 'พิมพ์ชนก', lastName: 'ใจดี', passwordChangedAt: new Date() },
  })
  await prisma.user.upsert({
    where: { id: 'lecturer-001' },
    update: { gender: 'MALE', passwordHash, status: 'ACTIVE', recordStatus: 'ACTIVE', passwordChangedAt: new Date() },
    create: { id: 'lecturer-001', username: 'lecturer001', passwordHash, role: 'LECTURER', status: 'ACTIVE', namePrefix: 'อาจารย์', firstName: 'ผู้นิเทศ', lastName: '', gender: 'MALE', passwordChangedAt: new Date(), createdById: 'staff-001' },
  })
  await prisma.user.upsert({
    where: { id: 'student-001' },
    update: { passwordHash, status: 'ACTIVE', recordStatus: 'ACTIVE', passwordChangedAt: new Date() },
    create: { id: 'student-001', username: '66123456701', passwordHash, role: 'STUDENT', status: 'ACTIVE', namePrefix: 'นาย', firstName: 'ธนกฤต', lastName: 'พูนทรัพย์', cohortYear: 2566, section: '1', passwordChangedAt: new Date(), createdById: 'staff-001' },
  })

  return { seeded: true }
})
