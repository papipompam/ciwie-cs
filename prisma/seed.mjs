import { randomBytes, scrypt as scryptCallback } from 'node:crypto'
import { promisify } from 'node:util'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { demoCompany, demoPlacementRequest, demoStudentApplication, workbookDemoCompanies } from './demo-data.mjs'

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
const adminPasswordHash = await hashPassword('12341234')
const sampleLecturers = [
  ['10001', 'นาย', 'ชลัท', 'รังสิมาเทวัญ'],
  ['10002', 'ผศ.ดร.', 'สมศักดิ์', 'จีวัฒนา'],
  ['10003', 'ดร.', 'ทิพวัลย์', 'แสนคำ'],
  ['10004', 'ผศ.ดร.', 'ณัฐพล', 'แสนคำ'],
  ['10005', 'ดร.', 'ณปภัช', 'วรรณตรง'],
  ['10006', 'ดร.', 'ชาติวุฒิ', 'ธนาจิรันธร'],
  ['10007', 'นาย', 'สมพร', 'กระออมแก้ว'],
  ['10008', 'นาย', 'วิชชา', 'ภัทรนิธิคุณากร'],
  ['10009', 'นาย', 'วราวุธ', 'จอสูงเนิน'],
  ['10010', 'ดร.', 'สกรณ์', 'บุษบง'],
]

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
    where: { username: 'lecturer001' },
    update: { namePrefix: 'อาจารย์', firstName: 'ผู้นิเทศ', lastName: '', gender: 'MALE', phone: '0891111100', email: 'lecturer001@example.ac.th', passwordHash: defaultPasswordHash, status: 'ACTIVE', recordStatus: 'ACTIVE', passwordChangedAt: new Date() },
    create: {
      id: 'lecturer-001', username: 'lecturer001', passwordHash: defaultPasswordHash, role: 'LECTURER', status: 'ACTIVE',
      namePrefix: 'อาจารย์', firstName: 'ผู้นิเทศ', lastName: '', phone: '0891111100', email: 'lecturer001@example.ac.th', gender: 'MALE',
      passwordChangedAt: new Date(), createdById: 'staff-001',
    },
  })
  await prisma.user.upsert({
    where: { id: 'student-001' },
    update: { username: '000000000000', namePrefix: 'นาย', firstName: 'ตัวอย่าง', lastName: 'ตัวอย่าง', phone: '0812345601', email: 'student-demo@example.ac.th', passwordHash: defaultPasswordHash, status: 'ACTIVE', recordStatus: 'ACTIVE', passwordChangedAt: new Date() },
    create: {
      id: 'student-001', username: '000000000000', passwordHash: defaultPasswordHash, role: 'STUDENT', status: 'ACTIVE',
      namePrefix: 'นาย', firstName: 'ตัวอย่าง', lastName: 'ตัวอย่าง', phone: '0812345601', email: 'student-demo@example.ac.th', cohortYear: 2566, section: '1',
      passwordChangedAt: new Date(), createdById: 'staff-001',
    },
  })
  await prisma.user.upsert({
    where: { username: 'admin001' },
    update: {
      namePrefix: '', firstName: 'ผู้ดูแลระบบ', lastName: '', passwordHash: adminPasswordHash,
      role: 'STAFF', status: 'ACTIVE', recordStatus: 'ACTIVE', passwordChangedAt: new Date(),
    },
    create: {
      id: 'admin-001', username: 'admin001', passwordHash: adminPasswordHash, role: 'STAFF',
      status: 'ACTIVE', recordStatus: 'ACTIVE', namePrefix: '', firstName: 'ผู้ดูแลระบบ', lastName: '',
      passwordChangedAt: new Date(), createdById: 'staff-001',
    },
  })

  if (process.env.SEED_DIRECTORY_SAMPLES === 'true') {
  // Additional deterministic accounts keep the demo directory useful for
  // pagination, section sorting, and lecturer grouping previews.
  for (let index = 0; index < 49; index += 1) {
    const number = index + 2
    const username = `66${String(100000100 + index).padStart(9, '0')}`
    const studentStatus = index % 5 === 0 ? 'FIRST_LOGIN' : 'ACTIVE'
    const studentPasswordHash = studentStatus === 'FIRST_LOGIN' ? await hashPassword(username) : defaultPasswordHash
    await prisma.user.upsert({
      where: { username },
      update: {
        passwordHash: studentPasswordHash, status: studentStatus,
        namePrefix: index % 3 === 0 ? 'นาย' : index % 3 === 1 ? 'นางสาว' : 'นาง',
        firstName: `นักศึกษา${number}`, lastName: 'ตัวอย่าง', phone: `08${String(100000000 + number).slice(-8)}`, email: `student${String(number).padStart(2, '0')}@example.ac.th`, gender: index % 2 === 0 ? 'MALE' : 'FEMALE',
        cohortYear: 2566, section: index % 2 === 0 ? '1' : '2', recordStatus: 'ACTIVE',
      },
      create: {
        id: `student-demo-${String(index + 2).padStart(3, '0')}`, username, passwordHash: studentPasswordHash,
        role: 'STUDENT', status: studentStatus,
        namePrefix: index % 3 === 0 ? 'นาย' : index % 3 === 1 ? 'นางสาว' : 'นาง',
        firstName: `นักศึกษา${number}`, lastName: 'ตัวอย่าง', phone: `08${String(100000000 + number).slice(-8)}`, email: `student${String(number).padStart(2, '0')}@example.ac.th`, gender: index % 2 === 0 ? 'MALE' : 'FEMALE',
        cohortYear: 2566, section: index % 2 === 0 ? '1' : '2', createdById: 'staff-001',
      },
    })
  }
  await prisma.user.upsert({
    where: { username: '660112230038' },
    update: {
      passwordHash: await hashPassword('12345678'), status: 'ACTIVE', recordStatus: 'ACTIVE',
      namePrefix: 'นาย', firstName: 'จิรายุ', lastName: 'ชมทอง', cohortYear: 2566, section: '2',
    },
    create: {
      id: 'student-jirayu-660112230038', username: '660112230038', passwordHash: await hashPassword('12345678'),
      role: 'STUDENT', status: 'ACTIVE', recordStatus: 'ACTIVE', namePrefix: 'นาย', firstName: 'จิรายุ', lastName: 'ชมทอง',
      cohortYear: 2566, section: '2', email: '660112230038@example.ac.th', createdById: 'staff-001',
    },
  })
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
  for (const [username, namePrefix, firstName, lastName] of sampleLecturers) {
    await prisma.user.upsert({
      where: { username },
      update: {
        passwordHash: defaultPasswordHash, role: 'LECTURER', status: 'ACTIVE', recordStatus: 'ACTIVE',
        namePrefix, firstName, lastName, gender: null, phone: null, email: null,
      },
      create: {
        id: `lecturer-sample-${username}`, username, passwordHash: defaultPasswordHash,
        role: 'LECTURER', status: 'ACTIVE', namePrefix, firstName, lastName, createdById: 'staff-001',
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
    where: { cycleId_studentId: { cycleId: 'CYCLE-2569-2', studentId: 'student-jirayu-660112230038' } },
    update: { cohortYearSnapshot: 2566, sectionSnapshot: '2', currentStudentKey: '660112230038', enrollmentStatus: 'ACTIVE' },
    create: {
      id: 'ENROLLMENT-JIRAYU-038', cycleId: 'CYCLE-2569-2', studentId: 'student-jirayu-660112230038',
      cohortYearSnapshot: 2566, sectionSnapshot: '2', currentStudentKey: '660112230038', enrollmentStatus: 'ACTIVE', createdById: 'staff-001',
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

  if (process.env.SEED_DEMO_WORKFLOW === 'true') {
  await prisma.$transaction(async (transaction) => {
    const demoProvince = await transaction.province.upsert({
    where: { nameTh: demoCompany.province },
    update: { region: 'NORTHEAST' },
    create: { code: 'P-DEMO-BR', nameTh: demoCompany.province, region: 'NORTHEAST' },
    select: { id: true },
    })
    for (const company of workbookDemoCompanies) {
      const province = await transaction.province.upsert({
        where: { nameTh: company.province },
        update: {},
        create: { code: `WB-${company.province.slice(0, 3)}`, nameTh: company.province },
        select: { id: true },
      })
      await transaction.company.upsert({
        where: { id: company.id },
        update: { code: company.code, legalName: company.name, status: 'ACTIVE' },
        create: { id: company.id, code: company.code, legalName: company.name, status: 'ACTIVE', createdById: 'staff-001' },
      })
      await transaction.companySite.upsert({
        where: { id: company.siteId },
        update: { companyId: company.id, branchName: 'สำนักงานใหญ่', address: company.address, provinceId: province.id, contactName: company.contact, latitude: company.latitude, longitude: company.longitude, recordStatus: 'ACTIVE' },
        create: { id: company.siteId, companyId: company.id, branchName: 'สำนักงานใหญ่', address: company.address, provinceId: province.id, contactName: company.contact, latitude: company.latitude, longitude: company.longitude },
      })
    }
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

    // Use the workbook companies as realistic staff-application examples.
    // Skip these rows when the optional directory seed is disabled because
    // their generated student enrollments do not exist in that mode.
    const workbookApplicationStatuses = [
      'SUBMITTED', 'WAITING_RESPONSE', 'RESPONDED', 'WAITING_INTERVIEW',
      'ACCEPTED', 'REJECTED', 'COMPLETED', 'CANCELLED', 'SUBMITTED', 'WAITING_RESPONSE',
    ]
    const workbookApplicationPositions = [
      'นักศึกษาฝึกงานด้านพัฒนาเว็บไซต์', 'นักศึกษาฝึกงานด้านระบบเครือข่าย',
      'นักศึกษาฝึกงานด้านวิทยาการข้อมูล', 'นักศึกษาฝึกงานด้านทดสอบซอฟต์แวร์',
      'นักศึกษาฝึกงานด้านสนับสนุนระบบสารสนเทศ', 'นักศึกษาฝึกงานด้านพัฒนาโปรแกรม',
      'นักศึกษาฝึกงานด้านฐานข้อมูล', 'นักศึกษาฝึกงานด้านความมั่นคงปลอดภัยไซเบอร์',
      'นักศึกษาฝึกงานด้าน UX/UI', 'นักศึกษาฝึกงานด้านวิเคราะห์ระบบ',
    ]
    for (const [index, company] of workbookDemoCompanies.entries()) {
      const studentNumber = String(index + 2).padStart(3, '0')
      const enrollmentId = `ENROLLMENT-DEMO-${studentNumber}`
      const enrollment = await transaction.cycleEnrollment.findUnique({ where: { id: enrollmentId }, select: { id: true } })
      if (!enrollment) continue
      const applicationId = `WORKBOOK-APP-${String(index + 1).padStart(3, '0')}`
      const status = workbookApplicationStatuses[index]
      const activeStatus = !['REJECTED', 'CANCELLED', 'COMPLETED'].includes(status)
      const applicationData = {
        enrollmentId,
        companySiteId: company.siteId,
        companyNameSnapshot: company.name,
        companyLocation: company.address,
        recipientNameSnapshot: company.contact,
        letterAddressSnapshot: company.address,
        latitude: company.latitude,
        longitude: company.longitude,
        provinceSnapshot: company.province,
        positionTitle: workbookApplicationPositions[index],
        appliedDate: new Date(`2026-09-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`),
        status,
        activeSlotKey: activeStatus ? `WORKBOOK-ACTIVE-${String(index + 1).padStart(3, '0')}` : null,
      }
      await transaction.studentApplication.upsert({
        where: { id: applicationId },
        update: applicationData,
        create: { id: applicationId, ...applicationData },
      })
    }

    const workbookRequestStatuses = [
      'SUBMITTED', 'BATCHED', 'WAITING_RESPONSE', 'WAITING_REVIEW',
      'CONFIRMED', 'NOT_ACCEPTED', 'CANCELLED',
    ]
    for (const [index, status] of workbookRequestStatuses.entries()) {
      const company = workbookDemoCompanies[index]
      const requestNumber = String(index + 1).padStart(3, '0')
      const applicationId = `WORKBOOK-APP-${requestNumber}`
      const enrollmentId = `ENROLLMENT-DEMO-${String(index + 2).padStart(3, '0')}`
      const requestId = `WORKBOOK-REQ-${requestNumber}`
      const requestData = {
        requestNo: `RE${String(index + 1).padStart(5, '0')}`,
        studentApplicationId: applicationId,
        enrollmentId,
        companySiteId: company.siteId,
        companyNameSnapshot: company.name,
        companyLocationSnapshot: company.address,
        provinceSnapshot: company.province,
        latitude: company.latitude,
        longitude: company.longitude,
        positionTitle: workbookApplicationPositions[index],
        recipientName: company.contact,
        recipientRole: company.contact,
        letterAddress: company.address,
        status,
        activeSlotKey: ['NOT_ACCEPTED', 'CANCELLED'].includes(status) ? null : `WORKBOOK-REQUEST-${requestNumber}`,
        submittedAt: new Date(`2026-09-${String(index + 5).padStart(2, '0')}T09:00:00.000Z`),
      }
      await transaction.placementRequest.upsert({
        where: { id: requestId },
        update: requestData,
        create: { id: requestId, ...requestData },
      })
    }

    const workbookSupervisionGroups = [
      { id: 'WORKBOOK-GROUP-001', code: 'SG-WB-001', name: 'กลุ่มนิเทศ 1 · กรุงเทพมหานคร', companySiteId: demoCompany.companySiteId, lecturerId: 'lecturer-002' },
      { id: 'WORKBOOK-GROUP-002', code: 'SG-WB-002', name: 'กลุ่มนิเทศ 2 · บุรีรัมย์', companySiteId: 'WORKBOOK-SITE-005', lecturerId: 'lecturer-003' },
    ]
    for (const group of workbookSupervisionGroups) {
      await transaction.supervisionGroup.upsert({
        where: { id: group.id },
        update: { code: group.code, cycleId: 'CYCLE-2569-2', round: 1, name: group.name, createdById: 'staff-001' },
        create: { id: group.id, code: group.code, cycleId: 'CYCLE-2569-2', round: 1, name: group.name, createdById: 'staff-001' },
      })
      await transaction.supervisionGroupCompany.upsert({
        where: { id: `WORKBOOK-GROUP-COMP-${group.id.slice(-3)}` },
        update: { groupId: group.id, cycleId: 'CYCLE-2569-2', round: 1, companySiteId: group.companySiteId },
        create: { id: `WORKBOOK-GROUP-COMP-${group.id.slice(-3)}`, groupId: group.id, cycleId: 'CYCLE-2569-2', round: 1, companySiteId: group.companySiteId },
      })
      await transaction.supervisionGroupLecturer.upsert({
        where: { id: `WORKBOOK-GROUP-LECT-${group.id.slice(-3)}` },
        update: { groupId: group.id, cycleId: 'CYCLE-2569-2', round: 1, lecturerId: group.lecturerId },
        create: { id: `WORKBOOK-GROUP-LECT-${group.id.slice(-3)}`, groupId: group.id, cycleId: 'CYCLE-2569-2', round: 1, lecturerId: group.lecturerId },
      })
    }
    // Additional confirmed requests provide enough placements for a useful
    // supervision grouping preview without changing the status examples above.
    for (const index of [7, 8, 9]) {
      const company = workbookDemoCompanies[index]
      const requestNumber = String(index + 1).padStart(3, '0')
      const applicationId = `WORKBOOK-APP-${requestNumber}`
      const enrollmentId = `ENROLLMENT-DEMO-${String(index + 2).padStart(3, '0')}`
      const requestId = `WORKBOOK-REQ-${requestNumber}`
      const requestData = {
        requestNo: `RE${String(index + 1).padStart(5, '0')}`,
        studentApplicationId: applicationId,
        enrollmentId,
        companySiteId: company.siteId,
        companyNameSnapshot: company.name,
        companyLocationSnapshot: company.address,
        provinceSnapshot: company.province,
        latitude: company.latitude,
        longitude: company.longitude,
        positionTitle: workbookApplicationPositions[index],
        recipientName: company.contact,
        recipientRole: company.contact,
        letterAddress: company.address,
        status: 'CONFIRMED',
        activeSlotKey: `WORKBOOK-REQUEST-${requestNumber}`,
        submittedAt: new Date(`2026-09-${String(index + 12).padStart(2, '0')}T09:00:00.000Z`),
      }
      await transaction.placementRequest.upsert({
        where: { id: requestId },
        update: requestData,
        create: { id: requestId, ...requestData },
      })
    }

    await transaction.placementRequest.upsert({
    where: { id: demoPlacementRequest.id },
    update: {
      requestNo: 'RE00011',
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
      requestNo: 'RE00011',
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

    const supervisionGroups = [
      { id: 'WORKBOOK-GROUP-001', code: 'SG-WB-001', name: 'กลุ่มนิเทศ 1 · กรุงเทพมหานคร', companySiteIds: ['WORKBOOK-SITE-008', 'WORKBOOK-SITE-009', 'WORKBOOK-SITE-010'], lecturerIds: ['lecturer-002'] },
      { id: 'WORKBOOK-GROUP-002', code: 'SG-WB-002', name: 'กลุ่มนิเทศ 2 · บุรีรัมย์', companySiteIds: ['DEMO-SITE-001', 'WORKBOOK-SITE-005'], lecturerIds: ['lecturer-003'] },
    ]
    for (const group of supervisionGroups) {
      await transaction.supervisionGroup.upsert({
        where: { id: group.id },
        update: { code: group.code, cycleId: 'CYCLE-2569-2', round: 1, name: group.name, createdById: 'staff-001' },
        create: { id: group.id, code: group.code, cycleId: 'CYCLE-2569-2', round: 1, name: group.name, createdById: 'staff-001' },
      })
      for (const lecturerId of group.lecturerIds) {
        await transaction.supervisionGroupLecturer.upsert({
          where: { cycleId_round_lecturerId: { cycleId: 'CYCLE-2569-2', round: 1, lecturerId } },
          update: { groupId: group.id },
          create: { groupId: group.id, cycleId: 'CYCLE-2569-2', round: 1, lecturerId },
        })
      }
      for (const [companyIndex, companySiteId] of group.companySiteIds.entries()) {
        await transaction.supervisionGroupCompany.upsert({
          where: { cycleId_round_companySiteId: { cycleId: 'CYCLE-2569-2', round: 1, companySiteId } },
          update: { groupId: group.id },
          create: { id: `${group.id}-COMPANY-${companyIndex + 1}`, groupId: group.id, cycleId: 'CYCLE-2569-2', round: 1, companySiteId },
        })
      }
    }

    const additionalExpenseGroups = [
      { number: 3, siteId: 'WORKBOOK-SITE-001', lecturerId: 'lecturer-sample-10001' },
      { number: 4, siteId: 'WORKBOOK-SITE-002', lecturerId: 'lecturer-sample-10002' },
      { number: 5, siteId: 'WORKBOOK-SITE-003', lecturerId: 'lecturer-sample-10003' },
      { number: 6, siteId: 'WORKBOOK-SITE-004', lecturerId: 'lecturer-sample-10004' },
      { number: 7, siteId: 'WORKBOOK-SITE-006', lecturerId: 'lecturer-sample-10005' },
      { number: 8, siteId: 'WORKBOOK-SITE-007', lecturerId: 'lecturer-sample-10006' },
      { number: 9, siteId: null, lecturerId: 'lecturer-sample-10007' },
      { number: 10, siteId: null, lecturerId: 'lecturer-sample-10008' },
    ]
    for (const item of additionalExpenseGroups) {
      const groupId = `WORKBOOK-GROUP-${String(item.number).padStart(3, '0')}`
      await transaction.supervisionGroup.upsert({
        where: { id: groupId },
        update: { code: `SG-WB-${String(item.number).padStart(3, '0')}`, cycleId: 'CYCLE-2569-2', round: 1, name: `กลุ่มนิเทศ ${item.number}`, createdById: 'staff-001' },
        create: { id: groupId, code: `SG-WB-${String(item.number).padStart(3, '0')}`, cycleId: 'CYCLE-2569-2', round: 1, name: `กลุ่มนิเทศ ${item.number}`, createdById: 'staff-001' },
      })
      await transaction.supervisionGroupLecturer.upsert({
        where: { cycleId_round_lecturerId: { cycleId: 'CYCLE-2569-2', round: 1, lecturerId: item.lecturerId } },
        update: { groupId },
        create: { groupId, cycleId: 'CYCLE-2569-2', round: 1, lecturerId: item.lecturerId },
      })
      if (item.siteId) {
        await transaction.supervisionGroupCompany.upsert({
          where: { cycleId_round_companySiteId: { cycleId: 'CYCLE-2569-2', round: 1, companySiteId: item.siteId } },
          update: { groupId },
          create: { id: `${groupId}-COMPANY`, groupId, cycleId: 'CYCLE-2569-2', round: 1, companySiteId: item.siteId },
        })
      }
    }
    const expenseGroups = [
      { number: 1, groupId: 'WORKBOOK-GROUP-001', lecturerIds: ['lecturer-002'], companyCount: 3 },
      { number: 2, groupId: 'WORKBOOK-GROUP-002', lecturerIds: ['lecturer-003'], companyCount: 1 },
      ...additionalExpenseGroups.map(item => ({ number: item.number, groupId: `WORKBOOK-GROUP-${String(item.number).padStart(3, '0')}`, lecturerIds: [item.lecturerId], companyCount: item.siteId ? 1 : 0 })),
    ]
    for (const item of expenseGroups) {
      const sequence = String(item.number).padStart(3, '0')
      const lecturerCount = item.lecturerIds.length
      const maleLecturerCount = item.number % 2 ? 1 : 0
      const femaleLecturerCount = lecturerCount - maleLecturerCount
      const fuel = 900 + item.number * 125
      const accommodation = 1600 + item.number * 320
      const allowance = lecturerCount * 240
      await transaction.supervisionExpense.upsert({
        where: { groupId: item.groupId },
        update: {
          groupId: item.groupId, fuelAmount: fuel, roomRate: 800, nights: 2, allowanceRate: 240, allowanceDays: 1, roomCapacity: 2,
          lecturerCount, maleLecturerCount, femaleLecturerCount, maleRoomCount: maleLecturerCount, femaleRoomCount: femaleLecturerCount,
          accommodationAmount: accommodation, allowanceAmount: allowance, totalAmount: fuel + accommodation + allowance,
          lecturerSnapshot: item.lecturerIds.map(id => ({ id, name: `อาจารย์นิเทศตัวอย่าง ${id.slice(-2)}`, gender: id.includes('1000') && Number(id.slice(-2)) % 2 === 0 ? 'female' : 'male' })), createdById: 'staff-001',
        },
        create: {
          id: `WORKBOOK-EXPENSE-${sequence}`, groupId: item.groupId, fuelAmount: fuel, roomRate: 800, nights: 2, allowanceRate: 240, allowanceDays: 1, roomCapacity: 2,
          lecturerCount, maleLecturerCount, femaleLecturerCount, maleRoomCount: maleLecturerCount, femaleRoomCount: femaleLecturerCount,
          accommodationAmount: accommodation, allowanceAmount: allowance, totalAmount: fuel + accommodation + allowance,
          lecturerSnapshot: item.lecturerIds.map(id => ({ id, name: `อาจารย์นิเทศตัวอย่าง ${id.slice(-2)}`, gender: id.includes('1000') && Number(id.slice(-2)) % 2 === 0 ? 'female' : 'male' })), createdById: 'staff-001',
        },
      })
    }

    const supervisionAppointments = [
      { id: 'WORKBOOK-APPOINTMENT-001', appointmentNo: 'SV1001', groupId: 'WORKBOOK-GROUP-001', companySiteId: 'WORKBOOK-SITE-008', requestId: 'WORKBOOK-REQ-008', lecturerId: 'lecturer-002', date: '2026-11-10', period: 'MORNING', status: 'PUBLISHED' },
      { id: 'WORKBOOK-APPOINTMENT-002', appointmentNo: 'SV1002', groupId: 'WORKBOOK-GROUP-001', companySiteId: 'WORKBOOK-SITE-009', requestId: 'WORKBOOK-REQ-009', lecturerId: 'lecturer-002', date: '2026-11-11', period: 'AFTERNOON', status: 'COMPLETED' },
      { id: 'WORKBOOK-APPOINTMENT-003', appointmentNo: 'SV1003', groupId: 'WORKBOOK-GROUP-001', companySiteId: 'WORKBOOK-SITE-010', requestId: 'WORKBOOK-REQ-010', lecturerId: 'lecturer-002', date: '2026-11-12', period: 'MORNING', status: 'POSTPONED' },
      { id: 'WORKBOOK-APPOINTMENT-004', appointmentNo: 'SV1004', groupId: 'WORKBOOK-GROUP-002', companySiteId: 'WORKBOOK-SITE-005', requestId: 'WORKBOOK-REQ-005', lecturerId: 'lecturer-003', date: '2026-11-13', period: 'AFTERNOON', status: 'PUBLISHED' },
    ]
    for (const appointment of supervisionAppointments) {
      const groupCompany = await transaction.supervisionGroupCompany.findUnique({
        where: { cycleId_round_companySiteId: { cycleId: 'CYCLE-2569-2', round: 1, companySiteId: appointment.companySiteId } },
        select: { id: true },
      })
      if (!groupCompany) continue
      const completed = appointment.status === 'COMPLETED'
      await transaction.supervisionAppointment.upsert({
        where: { id: appointment.id },
        update: {
          appointmentNo: appointment.appointmentNo, groupCompanyId: groupCompany.id,
          scheduledDate: new Date(`${appointment.date}T00:00:00.000Z`), period: appointment.period,
          status: appointment.status, publishedAt: appointment.status === 'DRAFT' ? null : new Date(`${appointment.date}T08:00:00.000Z`),
          completedAt: completed ? new Date(`${appointment.date}T16:00:00.000Z`) : null,
          resultSummary: completed ? 'นิเทศติดตามความก้าวหน้าการฝึกงานและแผนงานที่ได้รับมอบหมาย' : null,
          resultIssues: completed ? 'ไม่พบปัญหาสำคัญ' : null,
          resultSuggestions: completed ? 'จัดทำบันทึกการเรียนรู้รายสัปดาห์อย่างต่อเนื่อง' : null,
          companyRequirements: completed ? 'ขอให้นักศึกษาส่งรายงานความคืบหน้าตามกำหนด' : null,
          resultRecordedById: completed ? appointment.lecturerId : null,
          resultRecordedAt: completed ? new Date(`${appointment.date}T16:30:00.000Z`) : null,
        },
        create: {
          id: appointment.id, appointmentNo: appointment.appointmentNo, groupCompanyId: groupCompany.id,
          scheduledDate: new Date(`${appointment.date}T00:00:00.000Z`), period: appointment.period,
          status: appointment.status, publishedAt: appointment.status === 'DRAFT' ? null : new Date(`${appointment.date}T08:00:00.000Z`),
          completedAt: completed ? new Date(`${appointment.date}T16:00:00.000Z`) : null,
          resultSummary: completed ? 'นิเทศติดตามความก้าวหน้าการฝึกงานและแผนงานที่ได้รับมอบหมาย' : null,
          resultIssues: completed ? 'ไม่พบปัญหาสำคัญ' : null,
          resultSuggestions: completed ? 'จัดทำบันทึกการเรียนรู้รายสัปดาห์อย่างต่อเนื่อง' : null,
          companyRequirements: completed ? 'ขอให้นักศึกษาส่งรายงานความคืบหน้าตามกำหนด' : null,
          resultRecordedById: completed ? appointment.lecturerId : null,
          resultRecordedAt: completed ? new Date(`${appointment.date}T16:30:00.000Z`) : null,
          createdById: 'staff-001', publishedById: appointment.status === 'DRAFT' ? null : 'staff-001',
        },
      })
      await transaction.supervisionAppointmentLecturer.upsert({
        where: { appointmentId_lecturerId: { appointmentId: appointment.id, lecturerId: appointment.lecturerId } },
        update: { source: 'GROUP', role: 'LEAD', isActual: completed, confirmedAt: completed ? new Date(`${appointment.date}T08:30:00.000Z`) : null },
        create: { appointmentId: appointment.id, lecturerId: appointment.lecturerId, source: 'GROUP', role: 'LEAD', isActual: completed, confirmedAt: completed ? new Date(`${appointment.date}T08:30:00.000Z`) : null },
      })
      await transaction.supervisionAppointmentStudent.upsert({
        where: { appointmentId_placementRequestId: { appointmentId: appointment.id, placementRequestId: appointment.requestId } },
        update: {},
        create: { id: `WB-AS-${appointment.id.slice(-3)}`, appointmentId: appointment.id, placementRequestId: appointment.requestId },
      })
    }

    const studentDemoGroupCompany = await transaction.supervisionGroupCompany.findFirst({
      where: { groupId: 'WORKBOOK-GROUP-002', companySiteId: demoCompany.companySiteId },
      select: { id: true },
    })
    if (studentDemoGroupCompany) {
      const studentDemoAppointment = {
        id: 'DEMO-SUPERVISION-001', appointmentNo: 'SV2001', groupCompanyId: studentDemoGroupCompany.id,
        scheduledDate: new Date('2026-11-20T00:00:00.000Z'), period: 'MORNING', status: 'PUBLISHED',
        publishedAt: new Date('2026-11-15T08:00:00.000Z'), createdById: 'staff-001', publishedById: 'staff-001',
      }
      await transaction.supervisionAppointment.upsert({
        where: { id: studentDemoAppointment.id },
        update: studentDemoAppointment,
        create: studentDemoAppointment,
      })
      await transaction.supervisionAppointmentLecturer.upsert({
        where: { appointmentId_lecturerId: { appointmentId: studentDemoAppointment.id, lecturerId: 'lecturer-003' } },
        update: { source: 'GROUP', role: 'LEAD', isActual: false },
        create: { appointmentId: studentDemoAppointment.id, lecturerId: 'lecturer-003', source: 'GROUP', role: 'LEAD' },
      })
      await transaction.supervisionAppointmentStudent.upsert({
        where: { appointmentId_placementRequestId: { appointmentId: studentDemoAppointment.id, placementRequestId: demoPlacementRequest.id } },
        update: {},
        create: { id: 'DEMO-APPOINT-STU-001', appointmentId: studentDemoAppointment.id, placementRequestId: demoPlacementRequest.id },
      })
    }

    const completedAppointmentStudent = await transaction.supervisionAppointmentStudent.findUnique({
      where: { appointmentId_placementRequestId: { appointmentId: 'WORKBOOK-APPOINTMENT-002', placementRequestId: 'WORKBOOK-REQ-009' } },
      select: { id: true },
    })
    if (completedAppointmentStudent) {
      await transaction.studentEvaluation.upsert({
        where: { id: 'WORKBOOK-STUDENT-EVAL-001' },
        update: {
          appointmentStudentId: completedAppointmentStudent.id, evaluatorLecturerId: 'lecturer-002', rubricVersion: 1, status: 'SUBMITTED',
          responsibilityScore: 5, disciplineScore: 4, communicationScore: 5, knowledgeScore: 4, workQualityScore: 5, problemSolvingScore: 4,
          strengths: 'มีความรับผิดชอบ เรียนรู้เร็ว และสื่อสารกับทีมได้ดี', issues: 'ควรเพิ่มประสบการณ์การนำเสนอผลงานต่อผู้ใช้งาน',
          suggestions: 'ฝึกสรุปผลการทำงานเป็นรายสัปดาห์และนำเสนอให้กระชับ', nextFollowUp: 'ติดตามความก้าวหน้าในรอบถัดไป',
          submittedAt: new Date('2026-11-11T17:00:00.000Z'),
        },
        create: {
          id: 'WORKBOOK-STUDENT-EVAL-001', appointmentStudentId: completedAppointmentStudent.id, evaluatorLecturerId: 'lecturer-002', rubricVersion: 1, status: 'SUBMITTED',
          responsibilityScore: 5, disciplineScore: 4, communicationScore: 5, knowledgeScore: 4, workQualityScore: 5, problemSolvingScore: 4,
          strengths: 'มีความรับผิดชอบ เรียนรู้เร็ว และสื่อสารกับทีมได้ดี', issues: 'ควรเพิ่มประสบการณ์การนำเสนอผลงานต่อผู้ใช้งาน',
          suggestions: 'ฝึกสรุปผลการทำงานเป็นรายสัปดาห์และนำเสนอให้กระชับ', nextFollowUp: 'ติดตามความก้าวหน้าในรอบถัดไป',
          submittedAt: new Date('2026-11-11T17:00:00.000Z'),
        },
      })
      await transaction.companyEvaluation.upsert({
        where: { id: 'WORKBOOK-COMPANY-EVAL-001' },
        update: {
          appointmentId: 'WORKBOOK-APPOINTMENT-002', evaluatorId: 'lecturer-002', rubricVersion: 1, status: 'SUBMITTED',
          workRelevanceScore: 5, workChallengeScore: 4, learningOpportunityScore: 5, supervisorReadinessScore: 5,
          studentSupportScore: 4, environmentScore: 5, safetyScore: 5, resourceReadinessScore: 4, allowanceScore: 4,
          transportationScore: 4, publicTransportScore: 4, nearbyAccommodationScore: 3, universityCoordinationScore: 5,
          recommendation: 'RECOMMENDED', observations: 'สถานประกอบการมีพี่เลี้ยงและงานที่สอดคล้องกับสาขาวิชา',
          companyRequirements: 'ควรจัดเตรียมแผนงานและผู้ดูแลนักศึกษาล่วงหน้า', issues: 'ที่พักใกล้สถานประกอบการมีตัวเลือกจำกัด',
          suggestions: 'เพิ่มช่องทางสื่อสารระหว่างพี่เลี้ยงกับอาจารย์นิเทศ', submittedAt: new Date('2026-11-11T17:15:00.000Z'),
        },
        create: {
          id: 'WORKBOOK-COMPANY-EVAL-001', appointmentId: 'WORKBOOK-APPOINTMENT-002', evaluatorId: 'lecturer-002', rubricVersion: 1, status: 'SUBMITTED',
          workRelevanceScore: 5, workChallengeScore: 4, learningOpportunityScore: 5, supervisorReadinessScore: 5,
          studentSupportScore: 4, environmentScore: 5, safetyScore: 5, resourceReadinessScore: 4, allowanceScore: 4,
          transportationScore: 4, publicTransportScore: 4, nearbyAccommodationScore: 3, universityCoordinationScore: 5,
          recommendation: 'RECOMMENDED', observations: 'สถานประกอบการมีพี่เลี้ยงและงานที่สอดคล้องกับสาขาวิชา',
          companyRequirements: 'ควรจัดเตรียมแผนงานและผู้ดูแลนักศึกษาล่วงหน้า', issues: 'ที่พักใกล้สถานประกอบการมีตัวเลือกจำกัด',
          suggestions: 'เพิ่มช่องทางสื่อสารระหว่างพี่เลี้ยงกับอาจารย์นิเทศ', submittedAt: new Date('2026-11-11T17:15:00.000Z'),
        },
      })
    }

    const evaluationAppointmentTemplates = [
      { groupId: 'WORKBOOK-GROUP-001', companySiteId: 'WORKBOOK-SITE-008', requestId: 'WORKBOOK-REQ-008', lecturerId: 'lecturer-002' },
      { groupId: 'WORKBOOK-GROUP-001', companySiteId: 'WORKBOOK-SITE-009', requestId: 'WORKBOOK-REQ-009', lecturerId: 'lecturer-002' },
      { groupId: 'WORKBOOK-GROUP-001', companySiteId: 'WORKBOOK-SITE-010', requestId: 'WORKBOOK-REQ-010', lecturerId: 'lecturer-002' },
      { groupId: 'WORKBOOK-GROUP-002', companySiteId: 'WORKBOOK-SITE-005', requestId: 'WORKBOOK-REQ-005', lecturerId: 'lecturer-003' },
    ]
    for (let index = 5; index <= 13; index += 1) {
      const sequence = String(index).padStart(3, '0')
      const template = evaluationAppointmentTemplates[(index - 5) % evaluationAppointmentTemplates.length]
      const appointmentId = `WORKBOOK-APPOINTMENT-${sequence}`
      const groupCompany = await transaction.supervisionGroupCompany.findUnique({
        where: { cycleId_round_companySiteId: { cycleId: 'CYCLE-2569-2', round: 1, companySiteId: template.companySiteId } },
        select: { id: true },
      })
      if (!groupCompany) continue
      const date = `2026-11-${String(index + 9).padStart(2, '0')}`
      const completedAt = new Date(`${date}T16:00:00.000Z`)
      await transaction.supervisionAppointment.upsert({
        where: { id: appointmentId },
        update: {
          appointmentNo: `SV${String(1000 + index).padStart(4, '0')}`, groupCompanyId: groupCompany.id,
          scheduledDate: new Date(`${date}T00:00:00.000Z`), period: index % 2 ? 'MORNING' : 'AFTERNOON', status: 'COMPLETED',
          publishedAt: new Date(`${date}T08:00:00.000Z`), completedAt, resultSummary: 'นิเทศติดตามผลการปฏิบัติงานของนักศึกษาเรียบร้อยแล้ว',
          resultIssues: 'ไม่พบปัญหาที่ต้องแก้ไขเร่งด่วน', resultSuggestions: 'พัฒนาทักษะการสื่อสารและการจัดทำเอกสารต่อเนื่อง',
          companyRequirements: 'ขอให้ส่งผลการปฏิบัติงานตามกำหนด', resultRecordedById: template.lecturerId, resultRecordedAt: completedAt,
        },
        create: {
          id: appointmentId, appointmentNo: `SV${String(1000 + index).padStart(4, '0')}`, groupCompanyId: groupCompany.id,
          scheduledDate: new Date(`${date}T00:00:00.000Z`), period: index % 2 ? 'MORNING' : 'AFTERNOON', status: 'COMPLETED',
          publishedAt: new Date(`${date}T08:00:00.000Z`), completedAt, resultSummary: 'นิเทศติดตามผลการปฏิบัติงานของนักศึกษาเรียบร้อยแล้ว',
          resultIssues: 'ไม่พบปัญหาที่ต้องแก้ไขเร่งด่วน', resultSuggestions: 'พัฒนาทักษะการสื่อสารและการจัดทำเอกสารต่อเนื่อง',
          companyRequirements: 'ขอให้ส่งผลการปฏิบัติงานตามกำหนด', resultRecordedById: template.lecturerId, resultRecordedAt: completedAt,
          createdById: 'staff-001', publishedById: 'staff-001',
        },
      })
      const appointmentStudentId = `WB-AS-${sequence}`
      await transaction.supervisionAppointmentStudent.upsert({
        where: { appointmentId_placementRequestId: { appointmentId, placementRequestId: template.requestId } },
        update: {},
        create: { id: appointmentStudentId, appointmentId, placementRequestId: template.requestId },
      })
      await transaction.supervisionAppointmentLecturer.upsert({
        where: { appointmentId_lecturerId: { appointmentId, lecturerId: template.lecturerId } },
        update: { source: 'GROUP', role: 'LEAD', isActual: true, confirmedAt: new Date(`${date}T08:30:00.000Z`) },
        create: { appointmentId, lecturerId: template.lecturerId, source: 'GROUP', role: 'LEAD', isActual: true, confirmedAt: new Date(`${date}T08:30:00.000Z`) },
      })
      await transaction.studentEvaluation.upsert({
        where: { id: `WB-STUDENT-EVAL-${sequence}` },
        update: {
          appointmentStudentId, evaluatorLecturerId: template.lecturerId, rubricVersion: 1, status: 'SUBMITTED',
          responsibilityScore: 4 + (index % 2), disciplineScore: 4, communicationScore: 4 + (index % 2), knowledgeScore: 4,
          workQualityScore: 5, problemSolvingScore: 4, strengths: 'มีความรับผิดชอบและเรียนรู้การทำงานได้ดี', issues: 'ควรฝึกนำเสนอผลงานให้กระชับขึ้น',
          suggestions: 'ทบทวนงานและสรุปบทเรียนหลังปฏิบัติงาน', nextFollowUp: 'ติดตามผลในการนิเทศครั้งถัดไป', submittedAt: new Date(`${date}T17:00:00.000Z`),
        },
        create: {
          id: `WB-STUDENT-EVAL-${sequence}`, appointmentStudentId, evaluatorLecturerId: template.lecturerId, rubricVersion: 1, status: 'SUBMITTED',
          responsibilityScore: 4 + (index % 2), disciplineScore: 4, communicationScore: 4 + (index % 2), knowledgeScore: 4,
          workQualityScore: 5, problemSolvingScore: 4, strengths: 'มีความรับผิดชอบและเรียนรู้การทำงานได้ดี', issues: 'ควรฝึกนำเสนอผลงานให้กระชับขึ้น',
          suggestions: 'ทบทวนงานและสรุปบทเรียนหลังปฏิบัติงาน', nextFollowUp: 'ติดตามผลในการนิเทศครั้งถัดไป', submittedAt: new Date(`${date}T17:00:00.000Z`),
        },
      })
      await transaction.companyEvaluation.upsert({
        where: { id: `WB-COMPANY-EVAL-${sequence}` },
        update: {
          appointmentId, evaluatorId: template.lecturerId, rubricVersion: 1, status: 'SUBMITTED', workRelevanceScore: 5,
          workChallengeScore: 4, learningOpportunityScore: 5, supervisorReadinessScore: 4, studentSupportScore: 4,
          environmentScore: 5, safetyScore: 5, resourceReadinessScore: 4, allowanceScore: 4, transportationScore: 4,
          publicTransportScore: 4, nearbyAccommodationScore: 3, universityCoordinationScore: 5, recommendation: 'RECOMMENDED',
          observations: 'มีงานและผู้ดูแลที่เหมาะสมสำหรับนักศึกษา', companyRequirements: 'จัดเตรียมแผนงานล่วงหน้า', issues: 'ไม่พบปัญหาสำคัญ',
          suggestions: 'เพิ่มการสื่อสารความก้าวหน้ากับอาจารย์นิเทศ', submittedAt: new Date(`${date}T17:15:00.000Z`),
        },
        create: {
          id: `WB-COMPANY-EVAL-${sequence}`, appointmentId, evaluatorId: template.lecturerId, rubricVersion: 1, status: 'SUBMITTED', workRelevanceScore: 5,
          workChallengeScore: 4, learningOpportunityScore: 5, supervisorReadinessScore: 4, studentSupportScore: 4,
          environmentScore: 5, safetyScore: 5, resourceReadinessScore: 4, allowanceScore: 4, transportationScore: 4,
          publicTransportScore: 4, nearbyAccommodationScore: 3, universityCoordinationScore: 5, recommendation: 'RECOMMENDED',
          observations: 'มีงานและผู้ดูแลที่เหมาะสมสำหรับนักศึกษา', companyRequirements: 'จัดเตรียมแผนงานล่วงหน้า', issues: 'ไม่พบปัญหาสำคัญ',
          suggestions: 'เพิ่มการสื่อสารความก้าวหน้ากับอาจารย์นิเทศ', submittedAt: new Date(`${date}T17:15:00.000Z`),
        },
      })
    }

    // Make the lecturer demo account useful on all lecturer supervision and
    // evaluation pages. These are additional participant/evaluator records;
    // the staff-facing examples remain assigned to their original lecturers.
    const lecturerDemoAppointments = ['WORKBOOK-APPOINTMENT-002', ...Array.from({ length: 9 }, (_, index) => `WORKBOOK-APPOINTMENT-${String(index + 5).padStart(3, '0')}`)]
    for (const [index, appointmentId] of lecturerDemoAppointments.entries()) {
      const appointmentStudent = await transaction.supervisionAppointmentStudent.findFirst({ where: { appointmentId }, select: { id: true } })
      if (!appointmentStudent) continue
      const date = `2026-11-${String(index + 11).padStart(2, '0')}`
      await transaction.supervisionAppointmentLecturer.upsert({
        where: { appointmentId_lecturerId: { appointmentId, lecturerId: 'lecturer-001' } },
        update: { source: 'MANUAL', role: 'PARTICIPANT', isActual: true, confirmedAt: new Date(`${date}T08:45:00.000Z`) },
        create: { appointmentId, lecturerId: 'lecturer-001', source: 'MANUAL', role: 'PARTICIPANT', isActual: true, confirmedAt: new Date(`${date}T08:45:00.000Z`) },
      })
      const studentScores = {
        appointmentStudentId: appointmentStudent.id, evaluatorLecturerId: 'lecturer-001', rubricVersion: 1, status: 'SUBMITTED',
        responsibilityScore: 5, disciplineScore: 4, communicationScore: 5, knowledgeScore: 4, workQualityScore: 4, problemSolvingScore: 5,
        strengths: 'ปรับตัวเข้ากับทีมได้ดีและรับผิดชอบงานที่ได้รับมอบหมาย', issues: 'ควรเพิ่มความมั่นใจในการนำเสนอผลงาน',
        suggestions: 'ฝึกสรุปงานเป็นประเด็นและตรวจทานเอกสารก่อนส่ง', nextFollowUp: 'ติดตามพัฒนาการในการประเมินครั้งถัดไป', submittedAt: new Date(`${date}T17:00:00.000Z`),
      }
      await transaction.studentEvaluation.upsert({
        where: { appointmentStudentId_evaluatorLecturerId: { appointmentStudentId: appointmentStudent.id, evaluatorLecturerId: 'lecturer-001' } },
        update: studentScores,
        create: { id: `WB-L1-STUDENT-${String(index + 1).padStart(3, '0')}`, ...studentScores },
      })
      const companyScores = {
        appointmentId, evaluatorId: 'lecturer-001', rubricVersion: 1, status: 'SUBMITTED', workRelevanceScore: 5,
        workChallengeScore: 4, learningOpportunityScore: 5, supervisorReadinessScore: 4, studentSupportScore: 5,
        environmentScore: 5, safetyScore: 5, resourceReadinessScore: 4, allowanceScore: 4, transportationScore: 4,
        publicTransportScore: 4, nearbyAccommodationScore: 3, universityCoordinationScore: 5, recommendation: 'RECOMMENDED',
        observations: 'สถานประกอบการมีสภาพแวดล้อมและผู้ดูแลเหมาะสม', companyRequirements: 'จัดเตรียมแผนงานให้นักศึกษาล่วงหน้า',
        issues: 'ไม่พบปัญหาสำคัญ', suggestions: 'สื่อสารความคืบหน้ากับอาจารย์นิเทศอย่างต่อเนื่อง', submittedAt: new Date(`${date}T17:15:00.000Z`),
      }
      await transaction.companyEvaluation.upsert({
        where: { appointmentId_evaluatorId: { appointmentId, evaluatorId: 'lecturer-001' } },
        update: companyScores,
        create: { id: `WB-L1-COMPANY-${String(index + 1).padStart(3, '0')}`, ...companyScores },
      })
    }
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
}
finally {
  await prisma.$disconnect()
}
