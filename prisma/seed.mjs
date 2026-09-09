import { randomBytes, scrypt as scryptCallback } from 'node:crypto'
import { promisify } from 'node:util'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from '@prisma/client'
import { demoPlacementRequest, demoStudentApplication } from './demo-data.mjs'

const scrypt = promisify(scryptCallback)
if (process.env.ALLOW_DEMO_SEED !== 'true') {
  throw new Error('Refusing to create demo accounts unless ALLOW_DEMO_SEED=true')
}
const connectionString = process.env.DATABASE_URL ?? 'mysql://ciwie:ciwie@localhost:3307/ciwie_db'
const prisma = new PrismaClient({ adapter: new PrismaMariaDb(connectionString) })

const hashPassword = async (password) => {
  const salt = randomBytes(16).toString('hex')
  const key = await scrypt(password, salt, 64)
  return `scrypt$${salt}$${key.toString('hex')}`
}

const defaultPasswordHash = await hashPassword(process.env.SEED_DEFAULT_PASSWORD ?? 'Cwie@2569')

try {
  await prisma.user.upsert({
    where: { id: 'staff-001' },
    update: {},
    create: {
      id: 'staff-001', username: 'staff001', passwordHash: defaultPasswordHash, role: 'STAFF', status: 'ACTIVE',
      namePrefix: 'นางสาว', firstName: 'พิมพ์ชนก', lastName: 'ใจดี', passwordChangedAt: new Date(),
    },
  })
  await prisma.user.upsert({
    where: { id: 'lecturer-001' },
    update: { gender: 'MALE' },
    create: {
      id: 'lecturer-001', username: 'lecturer001', passwordHash: defaultPasswordHash, role: 'LECTURER', status: 'ACTIVE',
      namePrefix: 'อาจารย์', firstName: 'ผู้นิเทศ', lastName: '', gender: 'MALE',
      passwordChangedAt: new Date(), createdById: 'staff-001',
    },
  })
  await prisma.user.upsert({
    where: { id: 'student-001' },
    update: {},
    create: {
      id: 'student-001', username: '66123456701', passwordHash: defaultPasswordHash, role: 'STUDENT', status: 'ACTIVE',
      namePrefix: 'นาย', firstName: 'ธนกฤต', lastName: 'พูนทรัพย์', cohortYear: 2566, section: '1',
      passwordChangedAt: new Date(), createdById: 'staff-001',
    },
  })

  await prisma.coopCycle.upsert({
    where: { id: 'CYCLE-2569-2' },
    update: {},
    create: {
      id: 'CYCLE-2569-2', code: '2569-2', label: 'ภาคเรียนที่ 2/2569', academicYear: 2569, term: 'SECOND',
      termLabel: 'ภาคเรียนที่ 2', targetCohortYear: 2566, requestStartDate: new Date('2026-06-01'),
      requestEndDate: new Date('2026-09-30'), trainingStartDate: new Date('2026-11-01'),
      trainingEndDate: new Date('2027-02-28'), status: 'OPEN_FOR_REQUESTS',
    },
  })

  await prisma.cycleEnrollment.upsert({
    where: { id: 'ENROLLMENT-001' },
    update: {},
    create: {
      id: 'ENROLLMENT-001', cycleId: 'CYCLE-2569-2', studentId: 'student-001', cohortYearSnapshot: 2566,
      sectionSnapshot: '1', currentStudentKey: 'student-001', createdById: 'staff-001',
    },
  })

  const demoApplication = await prisma.studentApplication.upsert({
    where: { id: demoStudentApplication.id },
    update: {
      enrollmentId: demoStudentApplication.enrollmentId,
      companyNameSnapshot: demoStudentApplication.companyNameSnapshot,
      companyLocation: demoStudentApplication.companyLocation,
      recipientNameSnapshot: demoStudentApplication.recipientNameSnapshot,
      letterAddressSnapshot: demoStudentApplication.letterAddressSnapshot,
      latitude: demoStudentApplication.latitude,
      longitude: demoStudentApplication.longitude,
      provinceSnapshot: demoStudentApplication.provinceSnapshot,
      positionTitle: demoStudentApplication.positionTitle,
      appliedDate: new Date(`${demoStudentApplication.appliedDate}T00:00:00.000Z`),
      status: demoStudentApplication.status,
      activeSlotKey: demoStudentApplication.activeSlotKey,
    },
    create: {
      id: demoStudentApplication.id,
      enrollmentId: demoStudentApplication.enrollmentId,
      companyNameSnapshot: demoStudentApplication.companyNameSnapshot,
      companyLocation: demoStudentApplication.companyLocation,
      recipientNameSnapshot: demoStudentApplication.recipientNameSnapshot,
      letterAddressSnapshot: demoStudentApplication.letterAddressSnapshot,
      latitude: demoStudentApplication.latitude,
      longitude: demoStudentApplication.longitude,
      provinceSnapshot: demoStudentApplication.provinceSnapshot,
      positionTitle: demoStudentApplication.positionTitle,
      appliedDate: new Date(`${demoStudentApplication.appliedDate}T00:00:00.000Z`),
      status: demoStudentApplication.status,
      activeSlotKey: demoStudentApplication.activeSlotKey,
    },
  })

  await prisma.placementRequest.upsert({
    where: { id: demoPlacementRequest.id },
    update: {
      requestNo: demoPlacementRequest.requestNo,
      studentApplicationId: demoApplication.id,
      enrollmentId: demoPlacementRequest.enrollmentId,
      companyNameSnapshot: demoPlacementRequest.companyNameSnapshot,
      companyLocationSnapshot: demoPlacementRequest.companyLocationSnapshot,
      provinceSnapshot: demoPlacementRequest.provinceSnapshot,
      latitude: demoPlacementRequest.latitude,
      longitude: demoPlacementRequest.longitude,
      positionTitle: demoPlacementRequest.positionTitle,
      recipientName: demoPlacementRequest.recipientName,
      recipientRole: demoPlacementRequest.recipientRole,
      letterAddress: demoPlacementRequest.letterAddress,
      status: demoPlacementRequest.status,
      activeSlotKey: demoPlacementRequest.activeSlotKey,
      submittedAt: new Date(demoPlacementRequest.submittedAt),
    },
    create: {
      id: demoPlacementRequest.id,
      requestNo: demoPlacementRequest.requestNo,
      studentApplicationId: demoApplication.id,
      enrollmentId: demoPlacementRequest.enrollmentId,
      companyNameSnapshot: demoPlacementRequest.companyNameSnapshot,
      companyLocationSnapshot: demoPlacementRequest.companyLocationSnapshot,
      provinceSnapshot: demoPlacementRequest.provinceSnapshot,
      latitude: demoPlacementRequest.latitude,
      longitude: demoPlacementRequest.longitude,
      positionTitle: demoPlacementRequest.positionTitle,
      recipientName: demoPlacementRequest.recipientName,
      recipientRole: demoPlacementRequest.recipientRole,
      letterAddress: demoPlacementRequest.letterAddress,
      status: demoPlacementRequest.status,
      activeSlotKey: demoPlacementRequest.activeSlotKey,
      submittedAt: new Date(demoPlacementRequest.submittedAt),
    },
  })

  const demoNotification = await prisma.notification.upsert({
    where: { id: 'DEMO-NOTIF-001' },
    update: {
      type: 'PLACEMENT_REQUEST_SUBMITTED',
      severity: 'INFO',
      title: 'มีคำร้องขอเอกสารใหม่',
      body: 'นักศึกษาตัวอย่างยืนยันสถานประกอบการและส่งคำร้องให้เจ้าหน้าที่แล้ว',
      deepLink: '/staff/requests?request=DEMO-REQ-001',
      placementRequestId: demoPlacementRequest.id,
      createdById: 'student-001',
    },
    create: {
      id: 'DEMO-NOTIF-001',
      type: 'PLACEMENT_REQUEST_SUBMITTED',
      severity: 'INFO',
      title: 'มีคำร้องขอเอกสารใหม่',
      body: 'นักศึกษาตัวอย่างยืนยันสถานประกอบการและส่งคำร้องให้เจ้าหน้าที่แล้ว',
      deepLink: '/staff/requests?request=DEMO-REQ-001',
      placementRequestId: demoPlacementRequest.id,
      createdById: 'student-001',
    },
  })
  await prisma.notificationRecipient.upsert({
    where: { notificationId_accountId: { notificationId: demoNotification.id, accountId: 'staff-001' } },
    update: { readAt: null },
    create: { notificationId: demoNotification.id, accountId: 'staff-001' },
  })
}
finally {
  await prisma.$disconnect()
}
