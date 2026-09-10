import { randomBytes, scrypt as scryptCallback } from 'node:crypto'
import { promisify } from 'node:util'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { demoCompany, demoPlacementRequest, demoStudentApplication } from './demo-data.mjs'

const scrypt = promisify(scryptCallback)
if (process.env.ALLOW_DEMO_SEED !== 'true') {
  throw new Error('Refusing to create demo accounts unless ALLOW_DEMO_SEED=true')
}
const connectionString = (process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? 'postgresql://ciwie:ciwie@localhost:5432/ciwie_db').trim()
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) })

const hashPassword = async (password) => {
  const salt = randomBytes(16).toString('hex')
  const key = await scrypt(password, salt, 64)
  return `scrypt$${salt}$${key.toString('hex')}`
}

const defaultPasswordHash = await hashPassword(process.env.SEED_DEFAULT_PASSWORD ?? 'Cwie@2569')

try {
  await prisma.user.upsert({
    where: { id: 'staff-001' },
    update: { passwordHash: defaultPasswordHash, status: 'ACTIVE', passwordChangedAt: new Date() },
    create: {
      id: 'staff-001', username: 'staff001', passwordHash: defaultPasswordHash, role: 'STAFF', status: 'ACTIVE',
      namePrefix: 'นางสาว', firstName: 'พิมพ์ชนก', lastName: 'ใจดี', passwordChangedAt: new Date(),
    },
  })
  await prisma.user.upsert({
    where: { id: 'lecturer-001' },
    update: { gender: 'MALE', phone: '0891111100', email: 'lecturer001@example.ac.th', passwordHash: defaultPasswordHash, status: 'ACTIVE', passwordChangedAt: new Date() },
    create: {
      id: 'lecturer-001', username: 'lecturer001', passwordHash: defaultPasswordHash, role: 'LECTURER', status: 'ACTIVE',
      namePrefix: 'อาจารย์', firstName: 'ผู้นิเทศ', lastName: '', phone: '0891111100', email: 'lecturer001@example.ac.th', gender: 'MALE',
      passwordChangedAt: new Date(), createdById: 'staff-001',
    },
  })
  await prisma.user.upsert({
    where: { id: 'student-001' },
    update: { phone: '0812345601', email: 'thanakrit@example.ac.th', passwordHash: defaultPasswordHash, status: 'ACTIVE', passwordChangedAt: new Date() },
    create: {
      id: 'student-001', username: '66123456701', passwordHash: defaultPasswordHash, role: 'STUDENT', status: 'ACTIVE',
      namePrefix: 'นาย', firstName: 'ธนกฤต', lastName: 'พูนทรัพย์', phone: '0812345601', email: 'thanakrit@example.ac.th', cohortYear: 2566, section: '1',
      passwordChangedAt: new Date(), createdById: 'staff-001',
    },
  })

  // Additional deterministic accounts keep the demo directory useful for
  // pagination, section sorting, and lecturer grouping previews.
  for (let index = 0; index < 49; index += 1) {
    const number = index + 2
    const username = `66${String(100000100 + index).padStart(9, '0')}`
    await prisma.user.upsert({
      where: { username },
      update: {
        passwordHash: defaultPasswordHash, status: index % 5 === 0 ? 'FIRST_LOGIN' : 'ACTIVE',
        namePrefix: index % 3 === 0 ? 'นาย' : index % 3 === 1 ? 'นางสาว' : 'นาง',
        firstName: `นักศึกษา${number}`, lastName: 'ตัวอย่าง', phone: `08${String(100000000 + number).slice(-8)}`, email: `student${String(number).padStart(2, '0')}@example.ac.th`, gender: index % 2 === 0 ? 'MALE' : 'FEMALE',
        cohortYear: 2566, section: index % 2 === 0 ? '1' : '2', recordStatus: 'ACTIVE',
      },
      create: {
        id: `student-demo-${String(index + 2).padStart(3, '0')}`, username, passwordHash: defaultPasswordHash,
        role: 'STUDENT', status: index % 5 === 0 ? 'FIRST_LOGIN' : 'ACTIVE',
        namePrefix: index % 3 === 0 ? 'นาย' : index % 3 === 1 ? 'นางสาว' : 'นาง',
        firstName: `นักศึกษา${number}`, lastName: 'ตัวอย่าง', phone: `08${String(100000000 + number).slice(-8)}`, email: `student${String(number).padStart(2, '0')}@example.ac.th`, gender: index % 2 === 0 ? 'MALE' : 'FEMALE',
        cohortYear: 2566, section: index % 2 === 0 ? '1' : '2', createdById: 'staff-001',
      },
    })
  }
  for (let index = 0; index < 7; index += 1) {
    const lecturerNumber = String(index + 2).padStart(3, '0')
    await prisma.user.upsert({
      where: { id: `lecturer-${lecturerNumber}` },
      update: {
        passwordHash: defaultPasswordHash, status: 'ACTIVE', namePrefix: index % 2 === 0 ? 'อาจารย์' : 'ดร.',
        firstName: `อาจารย์ตัวอย่าง${index + 1}`, lastName: 'นิเทศ', phone: `089${String(10000000 + index + 1).slice(-7)}`, email: `lecturer${index + 5}@example.ac.th`, gender: index % 2 === 0 ? 'MALE' : 'FEMALE', recordStatus: 'ACTIVE',
      },
      create: {
        id: `lecturer-${lecturerNumber}`, username: `lecturer${lecturerNumber}`, passwordHash: defaultPasswordHash,
        role: 'LECTURER', status: 'ACTIVE', namePrefix: index % 2 === 0 ? 'อาจารย์' : 'ดร.',
        firstName: `อาจารย์ตัวอย่าง${index + 1}`, lastName: 'นิเทศ', phone: `089${String(10000000 + index + 1).slice(-7)}`, email: `lecturer${index + 5}@example.ac.th`, gender: index % 2 === 0 ? 'MALE' : 'FEMALE', createdById: 'staff-001',
      },
    })
  }

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

  // Put every generated student into the demo cycle so the directory can
  // display both the student's coop cycle and section from persisted data.
  for (let index = 0; index < 49; index += 1) {
    const studentId = `student-demo-${String(index + 2).padStart(3, '0')}`
    await prisma.cycleEnrollment.upsert({
      where: { cycleId_studentId: { cycleId: 'CYCLE-2569-2', studentId } },
      update: {
        cohortYearSnapshot: 2566,
        sectionSnapshot: index % 2 === 0 ? '1' : '2',
        currentStudentKey: studentId,
        enrollmentStatus: 'ACTIVE',
      },
      create: {
        id: `ENROLLMENT-DEMO-${String(index + 2).padStart(3, '0')}`,
        cycleId: 'CYCLE-2569-2', studentId, cohortYearSnapshot: 2566,
        sectionSnapshot: index % 2 === 0 ? '1' : '2', currentStudentKey: studentId,
        createdById: 'staff-001',
      },
    })
  }

  await prisma.cycleEnrollment.upsert({
    where: { id: 'ENROLLMENT-001' },
    update: {},
    create: {
      id: 'ENROLLMENT-001', cycleId: 'CYCLE-2569-2', studentId: 'student-001', cohortYearSnapshot: 2566,
      sectionSnapshot: '1', currentStudentKey: 'student-001', createdById: 'staff-001',
    },
  })

  await prisma.$transaction(async (transaction) => {
    const demoProvince = await transaction.province.upsert({
    where: { nameTh: demoCompany.province },
    update: { region: 'NORTHEAST' },
    create: { code: 'P-DEMO-BR', nameTh: demoCompany.province, region: 'NORTHEAST' },
    select: { id: true },
    })
    await transaction.company.upsert({
    where: { id: demoCompany.companyId },
    update: { code: demoCompany.code, legalName: demoCompany.legalName, status: 'ACTIVE' },
    create: {
      id: demoCompany.companyId, code: demoCompany.code, legalName: demoCompany.legalName,
      status: 'ACTIVE', createdById: 'staff-001',
    },
    })
    await transaction.companySite.upsert({
    where: { id: demoCompany.companySiteId },
    update: {
      companyId: demoCompany.companyId, branchName: demoCompany.branchName, address: demoCompany.address,
      provinceId: demoProvince.id, contactName: demoCompany.contactName, contactPhone: demoCompany.contactPhone,
      latitude: demoCompany.latitude, longitude: demoCompany.longitude, recordStatus: 'ACTIVE',
    },
    create: {
      id: demoCompany.companySiteId, companyId: demoCompany.companyId, branchName: demoCompany.branchName,
      address: demoCompany.address, provinceId: demoProvince.id, contactName: demoCompany.contactName,
      contactPhone: demoCompany.contactPhone, latitude: demoCompany.latitude, longitude: demoCompany.longitude,
    },
    })

    const demoApplication = await transaction.studentApplication.upsert({
    where: { id: demoStudentApplication.id },
    update: {
      enrollmentId: demoStudentApplication.enrollmentId,
      companySiteId: demoStudentApplication.companySiteId,
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
      companySiteId: demoStudentApplication.companySiteId,
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

    await transaction.placementRequest.upsert({
    where: { id: demoPlacementRequest.id },
    update: {
      requestNo: demoPlacementRequest.requestNo,
      studentApplicationId: demoApplication.id,
      enrollmentId: demoPlacementRequest.enrollmentId,
      companySiteId: demoCompany.companySiteId,
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
      companySiteId: demoCompany.companySiteId,
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
