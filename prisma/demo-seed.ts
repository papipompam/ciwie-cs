import { createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { Prisma, PrismaClient, UserRole, UserStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const ids = {
  organizations: ['de000000-0000-4000-8000-000000000001', 'de000000-0000-4000-8000-000000000002', 'de000000-0000-4000-8000-000000000003'],
  workSites: ['de000000-0000-4000-8000-000000000011', 'de000000-0000-4000-8000-000000000012', 'de000000-0000-4000-8000-000000000013'],
  contacts: ['de000000-0000-4000-8000-000000000021', 'de000000-0000-4000-8000-000000000022', 'de000000-0000-4000-8000-000000000023'],
  applications: ['de000000-0000-4000-8000-000000000031', 'de000000-0000-4000-8000-000000000032', 'de000000-0000-4000-8000-000000000033', 'de000000-0000-4000-8000-000000000034'],
  applicationHistories: ['de000000-0000-4000-8000-000000000041', 'de000000-0000-4000-8000-000000000042', 'de000000-0000-4000-8000-000000000043', 'de000000-0000-4000-8000-000000000044'],
  files: ['de000000-0000-4000-8000-000000000051', 'de000000-0000-4000-8000-000000000052'],
  fileVersions: ['de000000-0000-4000-8000-000000000061', 'de000000-0000-4000-8000-000000000062'],
  requests: ['de000000-0000-4000-8000-000000000071', 'de000000-0000-4000-8000-000000000072'],
  batch: 'de000000-0000-4000-8000-000000000081',
  members: ['de000000-0000-4000-8000-000000000091', 'de000000-0000-4000-8000-000000000092'],
  memberSlots: ['de000000-0000-4000-8000-000000000101', 'de000000-0000-4000-8000-000000000102'],
  documentVersion: 'de000000-0000-4000-8000-000000000111',
  delivery: 'de000000-0000-4000-8000-000000000121',
  deliveryHistory: 'de000000-0000-4000-8000-000000000122',
  response: 'de000000-0000-4000-8000-000000000131',
  responseResults: ['de000000-0000-4000-8000-000000000141', 'de000000-0000-4000-8000-000000000142'],
  placements: ['de000000-0000-4000-8000-000000000151', 'de000000-0000-4000-8000-000000000152'],
  placementVersions: ['de000000-0000-4000-8000-000000000161', 'de000000-0000-4000-8000-000000000162'],
  visits: ['de000000-0000-4000-8000-000000000171', 'de000000-0000-4000-8000-000000000172'],
  visitStudents: ['de000000-0000-4000-8000-000000000181', 'de000000-0000-4000-8000-000000000182', 'de000000-0000-4000-8000-000000000183', 'de000000-0000-4000-8000-000000000184'],
  visitLecturers: ['de000000-0000-4000-8000-000000000191', 'de000000-0000-4000-8000-000000000192'],
  visitSlots: ['de000000-0000-4000-8000-000000000201', 'de000000-0000-4000-8000-000000000202'],
  lecturerSlot: 'de000000-0000-4000-8000-000000000211',
  workSiteSlot: 'de000000-0000-4000-8000-000000000212',
  supervisionResults: ['de000000-0000-4000-8000-000000000221', 'de000000-0000-4000-8000-000000000222'],
  visitHistories: ['de000000-0000-4000-8000-000000000231', 'de000000-0000-4000-8000-000000000232'],
  note: 'de000000-0000-4000-8000-000000000241',
  requirement: 'de000000-0000-4000-8000-000000000242',
  templates: ['de000000-0000-4000-8000-000000000251', 'de000000-0000-4000-8000-000000000252'],
  templateVersions: ['de000000-0000-4000-8000-000000000261', 'de000000-0000-4000-8000-000000000262'],
  items: ['de000000-0000-4000-8000-000000000271', 'de000000-0000-4000-8000-000000000272', 'de000000-0000-4000-8000-000000000273', 'de000000-0000-4000-8000-000000000274'],
  evaluations: ['de000000-0000-4000-8000-000000000281', 'de000000-0000-4000-8000-000000000282'],
  evaluationVersions: ['de000000-0000-4000-8000-000000000283', 'de000000-0000-4000-8000-000000000284'],
  answers: ['de000000-0000-4000-8000-000000000291', 'de000000-0000-4000-8000-000000000292', 'de000000-0000-4000-8000-000000000293', 'de000000-0000-4000-8000-000000000294'],
  expense: 'de000000-0000-4000-8000-000000000301',
  expenseVersion: 'de000000-0000-4000-8000-000000000302',
  notifications: ['de000000-0000-4000-8000-000000000311', 'de000000-0000-4000-8000-000000000312', 'de000000-0000-4000-8000-000000000313'],
  audits: ['de000000-0000-4000-8000-000000000321', 'de000000-0000-4000-8000-000000000322'],
} as const

interface DemoSeedConfig {
  databaseUrl: string
  target: string
  adminPassword: string
  lecturerPassword: string
  studentPassword: string
  s3: { endpoint: string, region: string, bucket: string, accessKeyId: string, secretAccessKey: string }
}

export function databaseFingerprint(databaseUrl: string): string {
  const parsed = new URL(databaseUrl)
  const database = parsed.pathname.replace(/^\//, '')
  if (!parsed.hostname || !database) throw new Error('DATABASE_URL must include a host and database name.')
  return `${parsed.hostname}:${parsed.port || '3306'}/${database}`
}

export function readDemoSeedConfig(env: NodeJS.ProcessEnv): DemoSeedConfig {
  if (env.DEMO_SEED_ENABLED !== 'true') throw new Error('Set DEMO_SEED_ENABLED=true to create demo data.')
  if (env.NODE_ENV !== 'development' && env.NODE_ENV !== 'test') throw new Error('Demo seed is allowed only in development or test.')
  const databaseUrl = env.DATABASE_URL
  const target = env.DEMO_SEED_TARGET
  if (!databaseUrl || !target || databaseFingerprint(databaseUrl) !== target) {
    throw new Error('DEMO_SEED_TARGET must exactly match the DATABASE_URL host:port/database fingerprint.')
  }
  const passwords = [env.DEMO_ADMIN_PASSWORD, env.DEMO_LECTURER_PASSWORD, env.DEMO_STUDENT_PASSWORD]
  if (passwords.some(password => !password || password.length < 12)) throw new Error('Every demo password must contain at least 12 characters.')
  const endpoint = env.S3_ENDPOINT
  const bucket = env.S3_BUCKET
  const accessKeyId = env.S3_APP_ACCESS_KEY_ID
  const secretAccessKey = env.S3_APP_SECRET_ACCESS_KEY
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) throw new Error('Demo seed requires local object-storage configuration.')
  return {
    databaseUrl,
    target,
    adminPassword: passwords[0]!,
    lecturerPassword: passwords[1]!,
    studentPassword: passwords[2]!,
    s3: { endpoint, region: env.S3_REGION || 'us-east-1', bucket, accessKeyId, secretAccessKey },
  }
}

function normalize(value: string): string {
  return value.normalize('NFKC').trim().toLocaleLowerCase('en-US')
}

async function ensureUser(tx: Prisma.TransactionClient, input: { email: string, password: string, role: UserRole }) {
  const email = normalize(input.email)
  const existing = await tx.user.findUnique({ where: { normalizedEmail: email } })
  if (existing) {
    if (existing.role !== input.role) throw new Error(`Demo email ${email} already belongs to another role.`)
    return existing
  }
  return await tx.user.create({
    data: {
      identifier: email,
      normalizedIdentifier: email,
      email,
      normalizedEmail: email,
      passwordHash: await bcrypt.hash(input.password, 12),
      role: input.role,
      status: UserStatus.ACTIVE,
      mustChangePassword: false,
    },
  })
}

async function uploadDemoFiles(config: DemoSeedConfig): Promise<Array<{ content: Buffer, checksum: string, objectKey: string }>> {
  const client = new S3Client({
    endpoint: config.s3.endpoint,
    region: config.s3.region,
    forcePathStyle: true,
    credentials: { accessKeyId: config.s3.accessKeyId, secretAccessKey: config.s3.secretAccessKey },
  })
  const contents = [
    Buffer.from('%PDF-1.4\n% Demo cooperative education document\n1 0 obj<</Type/Catalog>>endobj\n%%EOF\n'),
    Buffer.from('%PDF-1.4\n% Demo organization response form\n1 0 obj<</Type/Catalog>>endobj\n%%EOF\n'),
  ]
  const objectKeys = ['uploads/demo/cooperative-request.pdf', 'uploads/demo/organization-response.pdf']
  const files = contents.map((content, index) => ({ content, objectKey: objectKeys[index]!, checksum: createHash('sha256').update(content).digest('hex') }))
  for (const file of files) {
    try {
      const existing = await client.send(new GetObjectCommand({ Bucket: config.s3.bucket, Key: file.objectKey }))
      if (!existing.Body) throw new Error(`Demo object ${file.objectKey} has no readable content.`)
      const existingContent = Buffer.from(await existing.Body.transformToByteArray())
      const existingChecksum = createHash('sha256').update(existingContent).digest('hex')
      if (existingChecksum !== file.checksum) throw new Error(`Demo object ${file.objectKey} already exists with different content.`)
      continue
    }
    catch (error: unknown) {
      const status = typeof error === 'object' && error !== null && '$metadata' in error
        ? (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode
        : undefined
      if (status !== 404 && (!(error instanceof Error) || error.name !== 'NoSuchKey')) throw error
    }
    await client.send(new PutObjectCommand({ Bucket: config.s3.bucket, Key: file.objectKey, Body: file.content, ContentType: 'application/pdf' }))
  }
  return files
}

async function createDemoData(config: DemoSeedConfig, files: Awaited<ReturnType<typeof uploadDemoFiles>>): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const demoAdmin = await ensureUser(tx, { email: 'admin.demo@bru.ac.th', password: config.adminPassword, role: UserRole.ADMIN })
    const lecturerUsers = await Promise.all([
      ensureUser(tx, { email: 'lecturer.demo@bru.ac.th', password: config.lecturerPassword, role: UserRole.LECTURER }),
      ensureUser(tx, { email: 'lecturer02.demo@bru.ac.th', password: config.lecturerPassword, role: UserRole.LECTURER }),
    ])
    const studentUsers = await Promise.all(Array.from({ length: 4 }, (_, index) => ensureUser(tx, {
      email: index === 0 ? 'student.demo@bru.ac.th' : `student0${index + 1}.demo@bru.ac.th`,
      password: config.studentPassword,
      role: UserRole.STUDENT,
    })))

    const lecturerNames = [['สมชาย', 'ใจดี'], ['กมลชนก', 'วิชาการ']]
    const lecturers = []
    for (let index = 0; index < lecturerUsers.length; index += 1) {
      const existing = await tx.lecturerProfile.findUnique({ where: { userId: lecturerUsers[index]!.id } })
      lecturers.push(existing ?? await tx.lecturerProfile.create({ data: { userId: lecturerUsers[index]!.id, employeeCode: `DEMO-L00${index + 1}`, firstNameTh: lecturerNames[index]![0]!, lastNameTh: lecturerNames[index]![1]!, phone: `080000001${index}` } }))
    }

    const studentNames = [['อนันต์', 'พัฒนา'], ['เบญญาภา', 'สร้างสรรค์'], ['ชยพล', 'เรียนรู้'], ['ดวงกมล', 'ก้าวหน้า']]
    const students = []
    for (let index = 0; index < studentUsers.length; index += 1) {
      const existing = await tx.studentProfile.findUnique({ where: { userId: studentUsers[index]!.id } })
      students.push(existing ?? await tx.studentProfile.create({ data: { userId: studentUsers[index]!.id, studentCode: `DEMO-2569-00${index + 1}`, firstNameTh: studentNames[index]![0]!, lastNameTh: studentNames[index]![1]!, phone: `089000001${index}` } }))
    }

    let term = await tx.coopTerm.findUnique({ where: { academicYear_semester: { academicYear: 2569, semester: 1 } } })
    term ??= await tx.coopTerm.create({ data: { academicYear: 2569, semester: 1, name: 'ภาคการศึกษาที่ 1/2569', startsOn: new Date('2026-06-01'), endsOn: new Date('2026-10-31'), isActive: true } })
    const enrollments = []
    for (const student of students) {
      const existing = await tx.studentTermEnrollment.findUnique({ where: { studentId_coopTermId: { studentId: student.id, coopTermId: term.id } } })
      enrollments.push(existing ?? await tx.studentTermEnrollment.create({ data: { studentId: student.id, coopTermId: term.id } }))
    }

    const organizationData = [
      { id: ids.organizations[0], nameTh: 'บริษัท เทคโนวา โซลูชันส์ จำกัด', nameEn: 'Technova Solutions Co., Ltd.', normalizedName: 'บริษัท เทคโนวา โซลูชันส์ จำกัด', taxId: '0999999999001' },
      { id: ids.organizations[1], nameTh: 'บริษัท สมาร์ทแฟคทอรี จำกัด', nameEn: 'Smart Factory Co., Ltd.', normalizedName: 'บริษัท สมาร์ทแฟคทอรี จำกัด', taxId: '0999999999002' },
      { id: ids.organizations[2], nameTh: 'บริษัท ดิจิทัลเฮลท์ เชียงใหม่ จำกัด', nameEn: 'Digital Health Chiang Mai Co., Ltd.', normalizedName: 'บริษัท ดิจิทัลเฮลท์ เชียงใหม่ จำกัด', taxId: '0999999999003' },
    ]
    const organizations = []
    for (const data of organizationData) {
      const existing = await tx.organization.findUnique({ where: { taxId: data.taxId } })
      organizations.push(existing ?? await tx.organization.create({ data: { ...data, createdById: demoAdmin.id, updatedById: demoAdmin.id } }))
    }

    const workSiteData = [
      { id: ids.workSites[0], organizationId: organizations[0]!.id, name: 'สำนักงานใหญ่ กรุงเทพฯ', normalizedName: 'สำนักงานใหญ่ กรุงเทพฯ', addressLine: '99 ถนนรัชดาภิเษก เขตดินแดง', province: 'กรุงเทพมหานคร', region: 'ภาคกลาง', postalCode: '10400' },
      { id: ids.workSites[1], organizationId: organizations[1]!.id, name: 'โรงงานชลบุรี', normalizedName: 'โรงงานชลบุรี', addressLine: '88 นิคมอุตสาหกรรมอมตะซิตี้', province: 'ชลบุรี', region: 'ภาคตะวันออก', postalCode: '20000' },
      { id: ids.workSites[2], organizationId: organizations[2]!.id, name: 'สำนักงานเชียงใหม่', normalizedName: 'สำนักงานเชียงใหม่', addressLine: '77 ถนนห้วยแก้ว อำเภอเมือง', province: 'เชียงใหม่', region: 'ภาคเหนือ', postalCode: '50200' },
    ]
    const workSites = []
    for (const data of workSiteData) {
      const existing = await tx.workSite.findUnique({ where: { organizationId_normalizedName: { organizationId: data.organizationId, normalizedName: data.normalizedName } } })
      workSites.push(existing ?? await tx.workSite.create({ data }))
    }

    const contactData = [
      { id: ids.contacts[0], organizationId: organizations[0]!.id, workSiteId: workSites[0]!.id, name: 'คุณวราภรณ์ ผู้ประสานงาน', position: 'HR Business Partner', email: 'hr.technova@example.invalid', phone: '021111111' },
      { id: ids.contacts[1], organizationId: organizations[1]!.id, workSiteId: workSites[1]!.id, name: 'คุณกิตติศักดิ์ โรงงาน', position: 'Engineering Manager', email: 'engineering.smartfactory@example.invalid', phone: '038222222' },
      { id: ids.contacts[2], organizationId: organizations[2]!.id, workSiteId: workSites[2]!.id, name: 'คุณรัตนา เชียงใหม่', position: 'Project Manager', email: 'pm.digitalhealth@example.invalid', phone: '053333333' },
    ]
    const contacts = []
    for (const data of contactData) {
      const existing = await tx.organizationContact.findUnique({ where: { id: data.id } })
      contacts.push(existing ?? await tx.organizationContact.create({ data }))
    }

    const applicationStatuses = ['WAITING_RESPONSE', 'WAITING_RESPONSE', 'SUBMITTED', 'REJECTED'] as const
    const applicationSites = [0, 0, 1, 2]
    const applications = []
    for (let index = 0; index < enrollments.length; index += 1) {
      const siteIndex = applicationSites[index]!
      const existing = await tx.application.findUnique({ where: { id: ids.applications[index]! } })
      const application = existing ?? await tx.application.create({ data: { id: ids.applications[index]!, studentTermId: enrollments[index]!.id, coopTermId: term.id, workSiteId: workSites[siteIndex]!.id, contactId: contacts[siteIndex]!.id, contactSnapshot: { name: contacts[siteIndex]!.name, email: contacts[siteIndex]!.email }, status: applicationStatuses[index], positionTitle: ['Full-stack Developer', 'Data Analyst', 'Automation Engineer', 'UX Researcher'][index], appliedAt: new Date(`2026-06-${10 + index}T03:00:00Z`), createdById: studentUsers[index]!.id, updatedById: studentUsers[index]!.id } })
      applications.push(application)
      if (!await tx.applicationStatusHistory.findUnique({ where: { id: ids.applicationHistories[index]! } })) await tx.applicationStatusHistory.create({ data: { id: ids.applicationHistories[index]!, applicationId: application.id, toStatus: application.status, actorId: index === 3 ? demoAdmin.id : studentUsers[index]!.id, reason: index === 3 ? 'ตำแหน่งเต็มแล้ว (ข้อมูลสาธิต)' : 'สร้างใบสมัครตัวอย่าง', snapshot: { positionTitle: application.positionTitle } } })
    }

    const storedFiles = []
    for (let index = 0; index < files.length; index += 1) {
      const existingFile = await tx.storedFile.findUnique({ where: { id: ids.files[index]! } })
      const file = existingFile ?? await tx.storedFile.create({ data: { id: ids.files[index]!, originalFilename: index === 0 ? 'หนังสือขอความอนุเคราะห์-demo.pdf' : 'แบบตอบรับ-demo.pdf', createdById: index === 0 ? demoAdmin.id : studentUsers[0]!.id, visibility: 'STUDENT_VISIBLE' } })
      storedFiles.push(file)
      if (!await tx.fileVersion.findUnique({ where: { id: ids.fileVersions[index]! } })) await tx.fileVersion.create({ data: { id: ids.fileVersions[index]!, fileId: file.id, revision: 1, objectKey: files[index]!.objectKey, checksumSha256: files[index]!.checksum, mimeType: 'application/pdf', extension: 'pdf', sizeBytes: BigInt(files[index]!.content.length), scanStatus: 'CLEAN', createdById: file.createdById } })
    }

    const requests = []
    for (let index = 0; index < 2; index += 1) {
      const existing = await tx.documentRequest.findUnique({ where: { id: ids.requests[index]! } })
      requests.push(existing ?? await tx.documentRequest.create({ data: { id: ids.requests[index]!, studentTermId: enrollments[index]!.id, applicationId: applications[index]!.id, coopTermId: term.id, workSiteId: workSites[0]!.id, status: 'READY_TO_SEND', createdById: studentUsers[index]!.id, updatedById: demoAdmin.id } }))
    }
    let batch = await tx.documentBatch.findUnique({ where: { id: ids.batch } })
    batch ??= await tx.documentBatch.create({ data: { id: ids.batch, coopTermId: term.id, workSiteId: workSites[0]!.id, status: 'SENT', documentType: 'COOP_REQUEST', documentNo: 'DEMO-001', documentYear: 2569, documentDate: new Date('2026-06-20'), createdById: demoAdmin.id, updatedById: demoAdmin.id } })
    const members = []
    for (let index = 0; index < 2; index += 1) {
      const existing = await tx.documentBatchMember.findUnique({ where: { id: ids.members[index]! } })
      const member = existing ?? await tx.documentBatchMember.create({ data: { id: ids.members[index]!, batchId: batch.id, requestId: requests[index]!.id, studentTermId: enrollments[index]!.id, coopTermId: term.id, workSiteId: workSites[0]!.id, snapshot: { studentCode: students[index]!.studentCode, studentName: `${students[index]!.firstNameTh} ${students[index]!.lastNameTh}` } } })
      members.push(member)
      if (!await tx.documentBatchStudentSlot.findUnique({ where: { id: ids.memberSlots[index]! } })) await tx.documentBatchStudentSlot.create({ data: { id: ids.memberSlots[index]!, batchMemberId: member.id, batchId: batch.id, studentTermId: enrollments[index]!.id, coopTermId: term.id, workSiteId: workSites[0]!.id } })
    }
    if (!await tx.documentVersion.findUnique({ where: { id: ids.documentVersion } })) await tx.documentVersion.create({ data: { id: ids.documentVersion, batchId: batch.id, revision: 1, kind: 'OFFICIAL_REQUEST', fileVersionId: ids.fileVersions[0], createdById: demoAdmin.id } })
    if (!await tx.delivery.findUnique({ where: { id: ids.delivery } })) await tx.delivery.create({ data: { id: ids.delivery, batchId: batch.id, status: 'WAITING_RESPONSE', ownerType: 'STUDENT', ownerUserId: studentUsers[0]!.id, channel: 'EMAIL', recipient: contacts[0]!.email, sentAt: new Date('2026-06-21T03:00:00Z'), note: 'จัดส่งเอกสารแล้ว (ข้อมูลสาธิต)', createdById: demoAdmin.id, updatedById: studentUsers[0]!.id } })
    if (!await tx.deliveryHistory.findUnique({ where: { id: ids.deliveryHistory } })) await tx.deliveryHistory.create({ data: { id: ids.deliveryHistory, deliveryId: ids.delivery, toStatus: 'WAITING_RESPONSE', actorId: studentUsers[0]!.id, reason: 'ส่งทางอีเมล', snapshot: { recipient: contacts[0]!.email } } })

    let response = await tx.responseForm.findUnique({ where: { id: ids.response } })
    response ??= await tx.responseForm.create({ data: { id: ids.response, batchId: batch.id, revision: 1, fileVersionId: ids.fileVersions[1], status: 'CONFIRMED', uploadedById: studentUsers[0]!.id, submittedAt: new Date('2026-06-25T03:00:00Z'), confirmedAt: new Date('2026-06-26T03:00:00Z'), confirmedById: demoAdmin.id } })
    const responseResults = []
    for (let index = 0; index < 2; index += 1) {
      const existing = await tx.responseStudentResult.findUnique({ where: { id: ids.responseResults[index]! } })
      responseResults.push(existing ?? await tx.responseStudentResult.create({ data: { id: ids.responseResults[index]!, responseFormId: response.id, batchMemberId: members[index]!.id, batchId: batch.id, result: 'ACCEPTED', note: 'สถานประกอบการตอบรับแล้ว', confirmedById: demoAdmin.id, confirmedAt: new Date('2026-06-26T03:00:00Z') } }))
    }
    const placements = []
    for (let index = 0; index < 2; index += 1) {
      const existing = await tx.placement.findUnique({ where: { studentTermId: enrollments[index]!.id } })
      const placement = existing ?? await tx.placement.create({ data: { id: ids.placements[index]!, studentTermId: enrollments[index]!.id, currentWorkSiteId: workSites[0]!.id, sourceResponseResultId: responseResults[index]!.id, status: 'ACTIVE', confirmedById: demoAdmin.id, confirmedAt: new Date('2026-06-26T03:00:00Z') } })
      placements.push(placement)
      if (!await tx.placementVersion.findUnique({ where: { id: ids.placementVersions[index]! } })) await tx.placementVersion.create({ data: { id: ids.placementVersions[index]!, placementId: placement.id, version: 1, snapshot: { workSiteId: workSites[0]!.id, status: 'ACTIVE' }, reason: 'ยืนยันสถานประกอบการจากแบบตอบรับ', actorId: demoAdmin.id } })
    }

    const visitDates = [new Date('2026-08-10'), new Date('2026-09-15')]
    const visits = []
    for (let index = 0; index < 2; index += 1) {
      const existing = await tx.supervisionVisit.findUnique({ where: { id: ids.visits[index]! } })
      visits.push(existing ?? await tx.supervisionVisit.create({ data: { id: ids.visits[index]!, coopTermId: term.id, workSiteId: workSites[0]!.id, round: index === 0 ? 'ROUND_1' : 'ROUND_2', visitDate: visitDates[index]!, period: index === 0 ? 'MORNING' : 'AFTERNOON', status: index === 0 ? 'COMPLETED' : 'SCHEDULED', createdById: demoAdmin.id, updatedById: lecturerUsers[index]!.id } }))
    }
    for (let visitIndex = 0; visitIndex < 2; visitIndex += 1) {
      for (let studentIndex = 0; studentIndex < 2; studentIndex += 1) {
        const flatIndex = visitIndex * 2 + studentIndex
        if (!await tx.visitStudent.findUnique({ where: { id: ids.visitStudents[flatIndex]! } })) await tx.visitStudent.create({ data: { id: ids.visitStudents[flatIndex]!, visitId: visits[visitIndex]!.id, studentTermId: enrollments[studentIndex]!.id, coopTermId: term.id, acknowledgementStatus: 'ACKNOWLEDGED', acknowledgedAt: new Date('2026-08-01T03:00:00Z') } })
      }
      if (!await tx.visitLecturer.findUnique({ where: { id: ids.visitLecturers[visitIndex]! } })) await tx.visitLecturer.create({ data: { id: ids.visitLecturers[visitIndex]!, visitId: visits[visitIndex]!.id, lecturerId: lecturers[visitIndex]!.id, acknowledgementStatus: 'ACKNOWLEDGED', acknowledgedAt: new Date('2026-08-01T03:00:00Z') } })
      if (!await tx.supervisionVisitHistory.findUnique({ where: { id: ids.visitHistories[visitIndex]! } })) await tx.supervisionVisitHistory.create({ data: { id: ids.visitHistories[visitIndex]!, visitId: visits[visitIndex]!.id, action: visitIndex === 0 ? 'COMPLETED' : 'SCHEDULED', snapshot: { round: visitIndex + 1, workSite: workSites[0]!.name }, actorId: lecturerUsers[visitIndex]!.id } })
    }
    for (let studentIndex = 0; studentIndex < 2; studentIndex += 1) {
      if (!await tx.visitStudentSlot.findUnique({ where: { id: ids.visitSlots[studentIndex]! } })) await tx.visitStudentSlot.create({ data: { id: ids.visitSlots[studentIndex]!, visitId: visits[1]!.id, studentTermId: enrollments[studentIndex]!.id, round: 'ROUND_2', visitDate: visitDates[1]!, period: 'AFTERNOON' } })
    }
    if (!await tx.visitLecturerSlot.findUnique({ where: { id: ids.lecturerSlot } })) await tx.visitLecturerSlot.create({ data: { id: ids.lecturerSlot, visitId: visits[1]!.id, lecturerId: lecturers[1]!.id, visitDate: visitDates[1]!, period: 'AFTERNOON' } })
    if (!await tx.visitWorkSiteSlot.findUnique({ where: { id: ids.workSiteSlot } })) await tx.visitWorkSiteSlot.create({ data: { id: ids.workSiteSlot, visitId: visits[1]!.id, workSiteId: workSites[0]!.id, visitDate: visitDates[1]!, period: 'AFTERNOON' } })

    for (let index = 0; index < 2; index += 1) if (!await tx.supervisionResult.findUnique({ where: { id: ids.supervisionResults[index]! } })) await tx.supervisionResult.create({ data: { id: ids.supervisionResults[index]!, visitStudentId: ids.visitStudents[index]!, outcome: 'COMPLETED', summary: index === 0 ? 'นักศึกษาปฏิบัติงานได้ดีและสื่อสารกับทีมได้ชัดเจน' : 'มีความก้าวหน้าด้านการวิเคราะห์ข้อมูล', submittedById: lecturerUsers[0]!.id, submittedAt: new Date('2026-08-10T09:00:00Z') } })
    if (!await tx.internalNote.findUnique({ where: { id: ids.note } })) await tx.internalNote.create({ data: { id: ids.note, visitId: visits[0]!.id, authorId: lecturerUsers[0]!.id, content: 'ควรติดตามการนำเสนอผลงานในรอบที่สอง' } })
    if (!await tx.companyRequirement.findUnique({ where: { id: ids.requirement } })) await tx.companyRequirement.create({ data: { id: ids.requirement, visitId: visits[0]!.id, placementId: placements[0]!.id, category: 'TECHNOLOGY', technology: 'Nuxt 4, TypeScript, MySQL', detail: 'ต้องการนักศึกษาที่เข้าใจ Web Application และฐานข้อมูล', authorId: lecturerUsers[0]!.id } })

    const templateData = [
      { id: ids.templates[0], code: 'DEMO-STUDENT-V1', subject: 'STUDENT' as const, name: 'แบบประเมินนักศึกษาสหกิจศึกษา (ตัวอย่าง)' },
      { id: ids.templates[1], code: 'DEMO-ORGANIZATION-V1', subject: 'ORGANIZATION' as const, name: 'แบบประเมินสถานประกอบการ (ตัวอย่าง)' },
    ]
    const templates = []
    for (const data of templateData) {
      const existing = await tx.evaluationTemplate.findUnique({ where: { code: data.code } })
      templates.push(existing ?? await tx.evaluationTemplate.create({ data: { ...data, createdById: demoAdmin.id, updatedById: demoAdmin.id } }))
    }
    const templateVersions = []
    for (let index = 0; index < 2; index += 1) {
      const existing = await tx.evaluationTemplateVersion.findUnique({ where: { templateId_version: { templateId: templates[index]!.id, version: 1 } } })
      templateVersions.push(existing ?? await tx.evaluationTemplateVersion.create({ data: { id: ids.templateVersions[index]!, templateId: templates[index]!.id, version: 1, status: 'PUBLISHED', contentHash: createHash('sha256').update(templateData[index]!.code).digest('hex'), publishedAt: new Date('2026-06-01T03:00:00Z'), publishedById: demoAdmin.id } }))
    }
    const itemData = [
      { id: ids.items[0], templateVersionId: templateVersions[0]!.id, code: 'PERFORMANCE', label: 'คุณภาพและความรับผิดชอบในการทำงาน', answerType: 'SCORE' as const, maxScore: new Prisma.Decimal(5), weight: new Prisma.Decimal(0.7), sortOrder: 1 },
      { id: ids.items[1], templateVersionId: templateVersions[0]!.id, code: 'COMMENT', label: 'ข้อเสนอแนะเพิ่มเติม', answerType: 'TEXT' as const, required: false, sortOrder: 2 },
      { id: ids.items[2], templateVersionId: templateVersions[1]!.id, code: 'SUPPORT', label: 'การสนับสนุนการเรียนรู้ของนักศึกษา', answerType: 'SCORE' as const, maxScore: new Prisma.Decimal(5), weight: new Prisma.Decimal(0.7), sortOrder: 1 },
      { id: ids.items[3], templateVersionId: templateVersions[1]!.id, code: 'SAFE', label: 'สถานประกอบการมีสภาพแวดล้อมปลอดภัย', answerType: 'BOOLEAN' as const, sortOrder: 2 },
    ]
    const items = []
    for (const data of itemData) {
      const existing = await tx.evaluationItem.findUnique({ where: { templateVersionId_code: { templateVersionId: data.templateVersionId, code: data.code } } })
      items.push(existing ?? await tx.evaluationItem.create({ data }))
    }
    let studentEvaluation = await tx.studentEvaluation.findUnique({ where: { id: ids.evaluations[0] } })
    studentEvaluation ??= await tx.studentEvaluation.create({ data: { id: ids.evaluations[0], visitStudentId: ids.visitStudents[0], templateVersionId: templateVersions[0]!.id, templateId: templates[0]!.id, status: 'SUBMITTED', version: 2, submittedAt: new Date('2026-08-10T10:00:00Z'), submittedById: lecturerUsers[0]!.id, createdById: lecturerUsers[0]!.id, updatedById: lecturerUsers[0]!.id } })
    let organizationEvaluation = await tx.organizationEvaluation.findUnique({ where: { id: ids.evaluations[1] } })
    organizationEvaluation ??= await tx.organizationEvaluation.create({ data: { id: ids.evaluations[1], visitId: visits[0]!.id, templateVersionId: templateVersions[1]!.id, templateId: templates[1]!.id, status: 'SUBMITTED', version: 2, submittedAt: new Date('2026-08-10T10:10:00Z'), submittedById: lecturerUsers[0]!.id, createdById: lecturerUsers[0]!.id, updatedById: lecturerUsers[0]!.id } })
    const answerData = [
      { id: ids.answers[0], evaluationId: studentEvaluation.id, itemId: items[0]!.id, itemSnapshot: { code: items[0]!.code, label: items[0]!.label, answerType: 'SCORE', maxScore: 5, weight: 0.7 }, scoreValue: new Prisma.Decimal(4.5) },
      { id: ids.answers[1], evaluationId: studentEvaluation.id, itemId: items[1]!.id, itemSnapshot: { code: items[1]!.code, label: items[1]!.label, answerType: 'TEXT' }, textValue: 'พัฒนาทักษะได้รวดเร็วและทำงานร่วมกับทีมได้ดี' },
    ]
    for (const data of answerData) if (!await tx.studentEvaluationAnswer.findUnique({ where: { id: data.id } })) await tx.studentEvaluationAnswer.create({ data })
    const orgAnswerData = [
      { id: ids.answers[2], evaluationId: organizationEvaluation.id, itemId: items[2]!.id, itemSnapshot: { code: items[2]!.code, label: items[2]!.label, answerType: 'SCORE', maxScore: 5, weight: 0.7 }, scoreValue: new Prisma.Decimal(5) },
      { id: ids.answers[3], evaluationId: organizationEvaluation.id, itemId: items[3]!.id, itemSnapshot: { code: items[3]!.code, label: items[3]!.label, answerType: 'BOOLEAN' }, booleanValue: true },
    ]
    for (const data of orgAnswerData) if (!await tx.organizationEvaluationAnswer.findUnique({ where: { id: data.id } })) await tx.organizationEvaluationAnswer.create({ data })
    if (!await tx.studentEvaluationVersion.findUnique({ where: { id: ids.evaluationVersions[0] } })) await tx.studentEvaluationVersion.create({ data: { id: ids.evaluationVersions[0], evaluationId: studentEvaluation.id, version: 2, snapshot: { status: 'SUBMITTED', templateVersionId: templateVersions[0]!.id, answers: [{ itemCode: 'PERFORMANCE', scoreValue: 4.5 }, { itemCode: 'COMMENT', textValue: 'พัฒนาทักษะได้รวดเร็วและทำงานร่วมกับทีมได้ดี' }] }, reason: 'ส่งผลประเมินตัวอย่าง', actorId: lecturerUsers[0]!.id } })
    if (!await tx.organizationEvaluationVersion.findUnique({ where: { id: ids.evaluationVersions[1] } })) await tx.organizationEvaluationVersion.create({ data: { id: ids.evaluationVersions[1], evaluationId: organizationEvaluation.id, version: 2, snapshot: { status: 'SUBMITTED', templateVersionId: templateVersions[1]!.id, answers: [{ itemCode: 'SUPPORT', scoreValue: 5 }, { itemCode: 'SAFE', booleanValue: true }] }, reason: 'ส่งผลประเมินสถานประกอบการตัวอย่าง', actorId: lecturerUsers[0]!.id } })

    if (!await tx.expense.findUnique({ where: { id: ids.expense } })) await tx.expense.create({ data: { id: ids.expense, visitId: visits[0]!.id, round: 'ROUND_1', travelDays: 1, travelAmount: new Prisma.Decimal(1200), lodgingAmount: new Prisma.Decimal(0), mealAmount: new Prisma.Decimal(500), totalAmount: new Prisma.Decimal(1700), note: 'ค่าเดินทางนิเทศรอบที่ 1 (ข้อมูลสาธิต)', createdById: demoAdmin.id, updatedById: demoAdmin.id } })
    if (!await tx.expenseVersion.findUnique({ where: { id: ids.expenseVersion } })) await tx.expenseVersion.create({ data: { id: ids.expenseVersion, expenseId: ids.expense, version: 1, snapshot: { travelAmount: 1200, mealAmount: 500, totalAmount: 1700 }, reason: 'สร้างข้อมูลค่าใช้จ่ายตัวอย่าง', actorId: demoAdmin.id } })

    const notificationData = [
      { id: ids.notifications[0], recipientId: studentUsers[0]!.id, eventType: 'VISIT_SCHEDULED', title: 'กำหนดการนิเทศรอบที่ 2', body: 'อาจารย์จะเข้านิเทศวันที่ 15 กันยายน 2569', entityType: 'VISIT', entityId: visits[1]!.id },
      { id: ids.notifications[1], recipientId: lecturerUsers[1]!.id, eventType: 'VISIT_ASSIGNED', title: 'ได้รับมอบหมายการนิเทศ', body: 'คุณได้รับมอบหมายการนิเทศบริษัท เทคโนวา โซลูชันส์ จำกัด', entityType: 'VISIT', entityId: visits[1]!.id },
      { id: ids.notifications[2], recipientId: demoAdmin.id, eventType: 'RESPONSE_CONFIRMED', title: 'ยืนยันแบบตอบรับแล้ว', body: 'แบบตอบรับตัวอย่างได้รับการยืนยันครบสองราย', entityType: 'RESPONSE_FORM', entityId: response.id },
    ]
    for (const data of notificationData) if (!await tx.notification.findUnique({ where: { id: data.id } })) await tx.notification.create({ data })
    const auditData = [
      { id: ids.audits[0], actorId: demoAdmin.id, action: 'DEMO_DATA_CREATED', entityType: 'DOCUMENT_BATCH', entityId: batch.id, requestId: 'demo-seed-document-batch', reason: 'สร้างชุดข้อมูลสาธิต', afterData: { documentNo: batch.documentNo, members: 2 } },
      { id: ids.audits[1], actorId: lecturerUsers[0]!.id, action: 'DEMO_EVALUATION_SUBMITTED', entityType: 'STUDENT_EVALUATION', entityId: studentEvaluation.id, requestId: 'demo-seed-evaluation', reason: 'สร้างผลประเมินสาธิต', afterData: { status: 'SUBMITTED', version: 2 } },
    ]
    for (const data of auditData) if (!await tx.auditLog.findUnique({ where: { id: data.id } })) await tx.auditLog.create({ data })
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30_000 })
}

export async function main(env: NodeJS.ProcessEnv = process.env): Promise<void> {
  const config = readDemoSeedConfig(env)
  const files = await uploadDemoFiles(config)
  await createDemoData(config, files)
  console.info('Demo data is ready. Existing records were left unchanged.')
}

const entry = process.argv[1]
if (entry && import.meta.url === pathToFileURL(entry).href) {
  main()
    .catch((error: unknown) => {
      console.error(error)
      process.exitCode = 1
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}
