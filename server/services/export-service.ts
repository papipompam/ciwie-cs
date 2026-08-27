import { createHash, randomUUID } from 'node:crypto'
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import ExcelJS from 'exceljs'
import type { Prisma, PrismaClient } from '@prisma/client'
import type { SessionActor } from '../../shared/types/api'
import { neutralizeSpreadsheetFormula } from '../domain/csv'
import { DomainError } from '../domain/errors'
import { assertExportAllowed, createCsv } from './import-export-service'
import type { PrivateStorageConfig } from './storage-service'
import { calculateCoverage } from './visit-service'

type ExportKind = 'STUDENT_ROSTER' | 'INTERNSHIP' | 'COVERAGE' | 'REQUIREMENT' | 'EXPENSE'
type ExportFormat = 'CSV' | 'XLSX'
const MAX_EXPORT_SOURCE_ROWS = 50_000

function assertExportSourceLimit(rows: readonly unknown[]): void {
  if (rows.length > MAX_EXPORT_SOURCE_ROWS) throw new DomainError('VALIDATION_FAILED', `Export exceeds the safe limit of ${MAX_EXPORT_SOURCE_ROWS} source rows; narrow the filters`)
}

export interface ExportFilters {
  search?: string
  status?: string
  coverage?: 'UNSCHEDULED' | 'SCHEDULED' | 'OVERDUE' | 'MISSING_RESULT' | 'COMPLETED'
  round?: 1 | 2
  province?: string
  region?: string
  category?: string
  technology?: string
  organizationId?: string
}

function optionalText(value: unknown, name: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string') throw new DomainError('VALIDATION_FAILED', `${name} filter must be text`)
  const normalized = value.trim().normalize('NFKC')
  if (normalized.length > 200) throw new DomainError('VALIDATION_FAILED', `${name} filter is too long`)
  return normalized || undefined
}

export function normalizeExportFilters(kind: ExportKind, raw: Record<string, unknown>): ExportFilters {
  const ignoredTableKeys = new Set(['page', 'pageSize', 'sort', 'order'])
  const allowed = new Set(['search', 'province', 'region', 'organizationId'])
  if (kind === 'STUDENT_ROSTER' || kind === 'INTERNSHIP') allowed.add('status')
  if (kind === 'COVERAGE') { allowed.add('coverage'); allowed.add('round') }
  if (kind === 'REQUIREMENT') { allowed.add('category'); allowed.add('technology') }
  if (kind === 'EXPENSE') allowed.add('round')
  const unsupported = Object.keys(raw).filter(key => !allowed.has(key) && !ignoredTableKeys.has(key))
  if (unsupported.length) throw new DomainError('VALIDATION_FAILED', `Unsupported export filters: ${unsupported.join(', ')}`)

  const filters: ExportFilters = {}
  for (const key of ['search', 'status', 'province', 'region', 'category', 'technology', 'organizationId'] as const) {
    const value = optionalText(raw[key], key)
    if (value) filters[key] = value
  }
  if (raw.coverage !== undefined && raw.coverage !== '') {
    const allowedCoverage = ['UNSCHEDULED', 'SCHEDULED', 'OVERDUE', 'MISSING_RESULT', 'COMPLETED'] as const
    if (typeof raw.coverage !== 'string' || !allowedCoverage.includes(raw.coverage as typeof allowedCoverage[number])) throw new DomainError('VALIDATION_FAILED', 'coverage filter is invalid')
    filters.coverage = raw.coverage as typeof allowedCoverage[number]
  }
  if (raw.round !== undefined && raw.round !== '') {
    const round = Number(raw.round)
    if (round !== 1 && round !== 2) throw new DomainError('VALIDATION_FAILED', 'round filter must be 1 or 2')
    filters.round = round
  }
  return filters
}

function studentSearch(search: string): Prisma.StudentTermEnrollmentWhereInput {
  return { OR: [
    { student: { studentCode: { contains: search } } },
    { student: { firstNameTh: { contains: search } } },
    { student: { lastNameTh: { contains: search } } },
    { student: { user: { email: { contains: search } } } },
  ] }
}

export async function generateExport(db: PrismaClient, actor: SessionActor, input: { kind: ExportKind, format: ExportFormat, coopTermId: string, filters?: Record<string, unknown> }): Promise<{ filename: string, mimeType: string, content: Uint8Array }> {
  assertExportAllowed(actor.role, input.kind)
  const term = await db.coopTerm.findUnique({ where: { id: input.coopTermId }, select: { isActive: true } })
  if (!term || (actor.role === 'LECTURER' && !term.isActive)) throw new DomainError('FORBIDDEN', 'Export is outside your permitted term scope')
  const filters = normalizeExportFilters(input.kind, input.filters ?? {})
  let headers: string[]
  let rows: string[][]
  if (input.kind === 'STUDENT_ROSTER' || input.kind === 'INTERNSHIP') {
    if (filters.status && input.kind === 'STUDENT_ROSTER' && !['PENDING', 'ACTIVE', 'SUSPENDED'].includes(filters.status)) throw new DomainError('VALIDATION_FAILED', 'Student status filter is invalid')
    if (filters.status && input.kind === 'INTERNSHIP' && !['ACTIVE', 'REVERSED', 'WITHOUT_PLACEMENT'].includes(filters.status)) throw new DomainError('VALIDATION_FAILED', 'Placement status filter is invalid')
    const placementFilter: Prisma.StudentTermEnrollmentWhereInput = input.kind !== 'INTERNSHIP' || !filters.status ? {}
      : filters.status === 'WITHOUT_PLACEMENT' ? { placement: null } : { placement: { status: filters.status as 'ACTIVE' | 'REVERSED' } }
    const workSiteFilter: Prisma.StudentTermEnrollmentWhereInput = filters.province || filters.region || filters.organizationId ? {
      placement: { currentWorkSite: { ...(filters.province ? { province: filters.province } : {}), ...(filters.region ? { region: filters.region } : {}), ...(filters.organizationId ? { organizationId: filters.organizationId } : {}) } },
    } : {}
    const enrollments = await db.studentTermEnrollment.findMany({
      where: {
        coopTermId: input.coopTermId,
        ...(filters.search ? studentSearch(filters.search) : {}),
        ...(input.kind === 'STUDENT_ROSTER' && filters.status ? { student: { user: { status: filters.status as 'PENDING' | 'ACTIVE' | 'SUSPENDED' } } } : {}),
        AND: [placementFilter, workSiteFilter],
      },
      include: { student: { include: { user: true } }, placement: { include: { currentWorkSite: { include: { organization: true } } } } },
      orderBy: [{ student: { studentCode: 'asc' } }, { id: 'asc' }], take: MAX_EXPORT_SOURCE_ROWS + 1,
    })
    assertExportSourceLimit(enrollments)
    headers = ['studentCode', 'firstNameTh', 'lastNameTh', 'email', 'placementStatus', 'organization', 'workSite']
    rows = enrollments.map(enrollment => [enrollment.student.studentCode, enrollment.student.firstNameTh, enrollment.student.lastNameTh, enrollment.student.user.email ?? '', enrollment.placement?.status ?? 'WITHOUT_PLACEMENT', enrollment.placement?.currentWorkSite.organization.nameTh ?? '', enrollment.placement?.currentWorkSite.name ?? ''].map(neutralizeSpreadsheetFormula))
  } else if (input.kind === 'COVERAGE') {
    const placements = await db.placement.findMany({
      where: {
        status: 'ACTIVE',
        studentTerm: { coopTermId: input.coopTermId },
        currentWorkSite: {
          ...(filters.province ? { province: filters.province } : {}), ...(filters.region ? { region: filters.region } : {}),
          ...(filters.organizationId ? { organizationId: filters.organizationId } : {}),
        },
        ...(filters.search ? { OR: [
          { studentTerm: studentSearch(filters.search) },
          { currentWorkSite: { OR: [{ name: { contains: filters.search } }, { organization: { nameTh: { contains: filters.search } } }] } },
        ] } : {}),
      },
      include: { studentTerm: { include: { student: true, visitStudents: { include: { visit: true, result: true } } } }, currentWorkSite: { include: { organization: true } } }, take: MAX_EXPORT_SOURCE_ROWS + 1,
    })
    assertExportSourceLimit(placements)
    headers = ['studentCode', 'round', 'coverage', 'visitDate', 'organization', 'workSite']
    rows = placements.flatMap(placement => (filters.round ? [filters.round] : [1, 2]).map((round) => {
      const member = placement.studentTerm.visitStudents.find(item => item.visit.round === (round === 1 ? 'ROUND_1' : 'ROUND_2') && item.visit.status !== 'CANCELLED')
      const status = calculateCoverage({ studentTermId: placement.studentTermId, round, visitStatus: member?.visit.status, visitDate: member?.visit.visitDate.toISOString().slice(0, 10), hasResult: Boolean(member?.result) }, new Date().toISOString().slice(0, 10))
      return { status, values: [placement.studentTerm.student.studentCode, String(round), status, member?.visit.visitDate.toISOString().slice(0, 10) ?? '', placement.currentWorkSite.organization.nameTh, placement.currentWorkSite.name].map(neutralizeSpreadsheetFormula) }
    })).filter(row => !filters.coverage || row.status === filters.coverage).map(row => row.values)
  } else if (input.kind === 'REQUIREMENT') {
    const requirements = await db.companyRequirement.findMany({
      where: {
        visit: { coopTermId: input.coopTermId, workSite: { ...(filters.province ? { province: filters.province } : {}), ...(filters.region ? { region: filters.region } : {}), ...(filters.organizationId ? { organizationId: filters.organizationId } : {}) } },
        ...(filters.category ? { category: filters.category } : {}), ...(filters.technology ? { technology: { contains: filters.technology } } : {}),
        ...(filters.search ? { OR: [{ detail: { contains: filters.search } }, { category: { contains: filters.search } }, { technology: { contains: filters.search } }] } : {}),
      },
      include: { visit: { include: { workSite: { include: { organization: true } } } } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: MAX_EXPORT_SOURCE_ROWS + 1,
    })
    assertExportSourceLimit(requirements)
    headers = ['category', 'technology', 'detail', 'organization', 'workSite', 'createdAt']
    rows = requirements.map(item => [item.category, item.technology ?? '', item.detail, item.visit.workSite.organization.nameTh, item.visit.workSite.name, item.createdAt.toISOString()].map(neutralizeSpreadsheetFormula))
  } else {
    if (actor.role !== 'ADMIN') throw new DomainError('FORBIDDEN', 'Expense export is admin-only')
    const round = filters.round === 1 ? 'ROUND_1' : filters.round === 2 ? 'ROUND_2' : undefined
    const expenses = await db.expense.findMany({
      where: {
        ...(round ? { round } : {}),
        visit: { coopTermId: input.coopTermId, workSite: {
          ...(filters.province ? { province: filters.province } : {}), ...(filters.region ? { region: filters.region } : {}),
          ...(filters.organizationId ? { organizationId: filters.organizationId } : {}),
          ...(filters.search ? { OR: [{ name: { contains: filters.search } }, { organization: { nameTh: { contains: filters.search } } }] } : {}),
        } },
      },
      include: { visit: { include: { workSite: { include: { organization: true } } } } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: MAX_EXPORT_SOURCE_ROWS + 1,
    })
    assertExportSourceLimit(expenses)
    headers = ['round', 'travelDays', 'organization', 'workSite', 'travel', 'lodging', 'meal', 'total']
    rows = expenses.map(item => [item.round, String(item.travelDays), item.visit.workSite.organization.nameTh, item.visit.workSite.name, item.travelAmount.toFixed(2), item.lodgingAmount.toFixed(2), item.mealAmount.toFixed(2), item.totalAmount.toFixed(2)].map(neutralizeSpreadsheetFormula))
  }
  const basename = `${input.kind.toLowerCase()}-${input.coopTermId}`
  if (input.format === 'CSV') return { filename: `${basename}.csv`, mimeType: 'text/csv; charset=utf-8', content: new TextEncoder().encode(createCsv(headers, rows)) }
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Export')
  worksheet.addRows([headers, ...rows])
  const buffer = await workbook.xlsx.writeBuffer()
  return { filename: `${basename}.xlsx`, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', content: new Uint8Array(buffer) }
}

export async function createExportJob(db: PrismaClient, actor: SessionActor, input: { kind: ExportKind, format: ExportFormat, coopTermId: string, filters: Record<string, unknown> }) {
  assertExportAllowed(actor.role, input.kind)
  const term = await db.coopTerm.findUnique({ where: { id: input.coopTermId }, select: { isActive: true } })
  if (!term || (actor.role === 'LECTURER' && !term.isActive)) throw new DomainError('FORBIDDEN', 'Export is outside your permitted term scope')
  const filters = normalizeExportFilters(input.kind, input.filters)
  return await db.exportJob.create({ data: { requestedById: actor.userId, kind: input.kind, format: input.format, filterSnapshot: { coopTermId: input.coopTermId, filters } as unknown as Prisma.InputJsonValue, status: 'PENDING' }, select: { id: true, status: true, expiresAt: true } })
}

export async function authorizeExportDownload(db: PrismaClient, actor: SessionActor, exportId: string, now = new Date()) {
  const job = await db.exportJob.findFirst({
    where: { id: exportId, requestedById: actor.userId, status: 'COMPLETED', expiresAt: { gt: now } },
    include: { fileVersion: true },
  })
  if (!job?.fileVersion || !actor.active) throw new DomainError('NOT_FOUND', 'Export file was not found or has expired')
  const kind = job.kind as ExportKind
  assertExportAllowed(actor.role, kind)
  const snapshot = job.filterSnapshot
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) throw new DomainError('NOT_FOUND', 'Export authorization snapshot is invalid')
  const record = snapshot as Record<string, unknown>
  if (Object.keys(record).some(key => key !== 'coopTermId' && key !== 'filters') || typeof record.coopTermId !== 'string' || !record.filters || typeof record.filters !== 'object' || Array.isArray(record.filters)) {
    throw new DomainError('NOT_FOUND', 'Export authorization snapshot is invalid')
  }
  try {
    normalizeExportFilters(kind, record.filters as Record<string, unknown>)
  } catch {
    throw new DomainError('NOT_FOUND', 'Export authorization snapshot is invalid')
  }
  const term = await db.coopTerm.findUnique({ where: { id: record.coopTermId }, select: { isActive: true } })
  if (!term || (actor.role === 'LECTURER' && !term.isActive)) throw new DomainError('FORBIDDEN', 'Export is outside your permitted term scope')
  return job.fileVersion
}

export async function processNextExportJob(db: PrismaClient, storage: PrivateStorageConfig): Promise<boolean> {
  const candidate = await db.exportJob.findFirst({ where: { status: 'PENDING' }, orderBy: { createdAt: 'asc' } })
  if (!candidate) return false
  const claimed = await db.exportJob.updateMany({ where: { id: candidate.id, status: 'PENDING' }, data: { status: 'PROCESSING', failureReason: null } })
  if (claimed.count !== 1) return true
  let uploadedObjectKey: string | undefined
  try {
    const snapshot = candidate.filterSnapshot as { coopTermId?: unknown, filters?: unknown }
    if (typeof snapshot.coopTermId !== 'string' || !snapshot.filters || typeof snapshot.filters !== 'object' || Array.isArray(snapshot.filters)) throw new Error('Export job filter snapshot is invalid')
    const user = await db.user.findUnique({ where: { id: candidate.requestedById }, include: { lecturerProfile: true } })
    if (!user || user.status !== 'ACTIVE' || user.role === 'STUDENT') throw new Error('Export requester is no longer authorized')
    const actor: SessionActor = { userId: user.id, role: user.role, active: true, sessionVersion: user.sessionVersion, ...(user.lecturerProfile ? { lecturerId: user.lecturerProfile.id } : {}) }
    const kind = candidate.kind as ExportKind
    const format = candidate.format as ExportFormat
    const output = await generateExport(db, actor, { kind, format, coopTermId: snapshot.coopTermId, filters: snapshot.filters as Record<string, unknown> })
    const objectKey = `exports/${actor.userId}/${randomUUID()}.${format.toLowerCase()}`
    const client = new S3Client({ endpoint: storage.endpoint, region: storage.region, forcePathStyle: Boolean(storage.endpoint), ...(storage.accessKeyId && storage.secretAccessKey ? { credentials: { accessKeyId: storage.accessKeyId, secretAccessKey: storage.secretAccessKey } } : {}) })
    await client.send(new PutObjectCommand({ Bucket: storage.bucket, Key: objectKey, Body: output.content, ContentType: output.mimeType }))
    uploadedObjectKey = objectKey
    await db.$transaction(async (tx) => {
      const fileVersion = await tx.fileVersion.create({ data: { revision: 1, objectKey, checksumSha256: createHash('sha256').update(output.content).digest('hex'), mimeType: output.mimeType, extension: `.${format.toLowerCase()}`, sizeBytes: output.content.byteLength, scanStatus: 'CLEAN', createdById: actor.userId, file: { create: { originalFilename: output.filename, createdById: actor.userId } } } })
      const completed = await tx.exportJob.updateMany({ where: { id: candidate.id, status: 'PROCESSING' }, data: { status: 'COMPLETED', fileVersionId: fileVersion.id, expiresAt: new Date(Date.now() + 24 * 60 * 60_000) } })
      if (completed.count !== 1) throw new Error('Export job claim was lost')
      await tx.notification.create({ data: { recipientId: actor.userId, eventType: 'EXPORT_COMPLETED', title: 'ไฟล์ส่งออกพร้อมแล้ว', body: 'ไฟล์ข้อมูลที่ขอส่งออกพร้อมดาวน์โหลดภายใน 24 ชั่วโมง', entityType: 'ExportJob', entityId: candidate.id } })
    })
    uploadedObjectKey = undefined
  } catch (error) {
    if (uploadedObjectKey) {
      const client = new S3Client({ endpoint: storage.endpoint, region: storage.region, forcePathStyle: Boolean(storage.endpoint), ...(storage.accessKeyId && storage.secretAccessKey ? { credentials: { accessKeyId: storage.accessKeyId, secretAccessKey: storage.secretAccessKey } } : {}) })
      await client.send(new DeleteObjectCommand({ Bucket: storage.bucket, Key: uploadedObjectKey })).catch(() => undefined)
    }
    await db.$transaction(async (tx) => {
      const failed = await tx.exportJob.updateMany({ where: { id: candidate.id, status: 'PROCESSING' }, data: { status: 'FAILED', failureReason: error instanceof Error ? error.message.slice(0, 1_000) : 'Export failed' } })
      if (failed.count === 1) await tx.notification.create({ data: { recipientId: candidate.requestedById, eventType: 'EXPORT_FAILED', title: 'ส่งออกข้อมูลไม่สำเร็จ', body: 'ไม่สามารถสร้างไฟล์ส่งออกได้ กรุณาลองใหม่หรือติดต่อผู้ดูแลระบบ', entityType: 'ExportJob', entityId: candidate.id } })
    })
  }
  return true
}
