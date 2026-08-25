import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import bcrypt from 'bcryptjs'
import ExcelJS from 'exceljs'
import type { Prisma, PrismaClient } from '@prisma/client'
import { z } from 'zod'
import type { SessionActor } from '../../shared/types/api'
import { MAX_IMPORT_ROWS } from '../../shared/constants/domain'
import { DomainError, isUniqueConstraintError } from '../domain/errors'
import { requireRole } from '../policies/authorization'
import { ClamAvTcpScanner } from './file-security-service'
import { hashNormalizedRows, normalizeStudentCode } from './import-export-service'
import { normalizeEmail } from './auth-service'
import type { PrivateStorageConfig } from './storage-service'

interface StudentImportRow { studentCode: string, firstNameTh: string, lastNameTh: string, email: string }

function parseCsv(content: Uint8Array): string[][] {
  const text = new TextDecoder('utf-8', { fatal: true }).decode(content).replace(/^\uFEFF/, '')
  const rows: string[][] = []; let row: string[] = []; let cell = ''; let quoted = false
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]!
    if (quoted && character === '"' && text[index + 1] === '"') { cell += '"'; index += 1 } else if (character === '"') quoted = !quoted
    else if (!quoted && character === ',') { row.push(cell); cell = '' } else if (!quoted && (character === '\n' || character === '\r')) {
      if (character === '\r' && text[index + 1] === '\n') index += 1
      row.push(cell); if (row.some(value => value.length)) rows.push(row); row = []; cell = ''
    } else cell += character
    if (cell.length > 10_000) throw new DomainError('VALIDATION_FAILED', 'Import cell exceeds 10,000 characters')
  }
  if (quoted) throw new DomainError('VALIDATION_FAILED', 'CSV contains an unterminated quoted field')
  row.push(cell); if (row.some(value => value.length)) rows.push(row)
  return rows
}

export async function parseStudentWorkbook(content: Uint8Array, extension: '.csv' | '.xlsx'): Promise<StudentImportRow[]> {
  let matrix: string[][]
  if (extension === '.csv') matrix = parseCsv(content)
  else {
    const workbook = new ExcelJS.Workbook()
    const workbookBytes = Buffer.from(content) as unknown as Parameters<typeof workbook.xlsx.load>[0]
    await workbook.xlsx.load(workbookBytes)
    if (workbook.worksheets.length !== 1) throw new DomainError('VALIDATION_FAILED', 'Import workbook must contain exactly one worksheet')
    const sheet = workbook.worksheets[0]!
    if (sheet.rowCount > MAX_IMPORT_ROWS + 1) throw new DomainError('VALIDATION_FAILED', `Import is limited to ${MAX_IMPORT_ROWS} rows`)
    matrix = []
    sheet.eachRow({ includeEmpty: false }, (worksheetRow) => {
      const values: string[] = []
      worksheetRow.eachCell({ includeEmpty: true }, (cell, column) => {
        if (cell.type === ExcelJS.ValueType.Formula || cell.hyperlink) throw new DomainError('VALIDATION_FAILED', 'Formulas and external links are not allowed in imports')
        const value = cell.text.trim()
        if (value.length > 10_000) throw new DomainError('VALIDATION_FAILED', 'Import cell exceeds 10,000 characters')
        values[column - 1] = value
      })
      matrix.push(values)
    })
  }
  const header = matrix.shift()?.map(value => value.trim())
  if (!header) throw new DomainError('VALIDATION_FAILED', 'Workbook has no header row')
  const raw = matrix.map(values => Object.fromEntries(header.map((key, index) => [key, values[index] ?? ''])))
  if (raw.length > MAX_IMPORT_ROWS) throw new DomainError('VALIDATION_FAILED', `Import is limited to ${MAX_IMPORT_ROWS} rows`)
  return raw.map((row, index) => {
    if (Object.values(row).some(value => /^[=+\-@]/.test(String(value).trim()))) throw new DomainError('VALIDATION_FAILED', `Row ${index + 2} contains a spreadsheet formula`)
    const studentCode = normalizeStudentCode(String(row.studentCode ?? row['รหัสนักศึกษา'] ?? ''))
    const firstNameTh = String(row.firstNameTh ?? row['ชื่อ'] ?? '').trim().normalize('NFKC')
    const lastNameTh = String(row.lastNameTh ?? row['นามสกุล'] ?? '').trim().normalize('NFKC')
    const email = normalizeEmail(String(row.email ?? row['อีเมล'] ?? ''))
    if (!studentCode || !firstNameTh || !lastNameTh || !email) throw new DomainError('VALIDATION_FAILED', `Row ${index + 2} is missing studentCode, firstNameTh, lastNameTh, or email`)
    if (!z.string().email().safeParse(email).success) throw new DomainError('VALIDATION_FAILED', `Row ${index + 2} has an invalid email`)
    return { studentCode, firstNameTh, lastNameTh, email }
  })
}

export async function previewStudentImport(db: PrismaClient, actor: SessionActor, input: { content: Uint8Array, filename: string, mimeType: string, coopTermId: string, extension: '.csv' | '.xlsx', storage: PrivateStorageConfig, clamav: { host: string, port: number } }): Promise<{ id: string, previewHash: string, counts: Record<string, number> }> {
  requireRole(actor, 'LECTURER', 'ADMIN')
  const term = await db.coopTerm.findUnique({ where: { id: input.coopTermId }, select: { isActive: true } })
  if (!term || (actor.role === 'LECTURER' && !term.isActive)) throw new DomainError('FORBIDDEN', 'Import is outside your permitted term scope')
  const scanner = new ClamAvTcpScanner(input.clamav.host, input.clamav.port)
  if (await scanner.scan(input.content) !== 'CLEAN') throw new DomainError('VALIDATION_FAILED', 'Uploaded import contains malware')
  const rows = await parseStudentWorkbook(input.content, input.extension)
  const existing = await db.studentProfile.findMany({ where: { studentCode: { in: rows.map(row => row.studentCode) } }, include: { user: true }, take: MAX_IMPORT_ROWS })
  const emailUsers = await db.user.findMany({ where: { normalizedEmail: { in: rows.map(row => row.email) } }, select: { id: true, normalizedEmail: true }, take: MAX_IMPORT_ROWS })
  const byCode = new Map(existing.map(student => [student.studentCode, student]))
  const byEmail = new Map(emailUsers.map(user => [user.normalizedEmail, user]))
  const codeCounts = rows.reduce<Map<string, number>>((counts, row) => counts.set(row.studentCode, (counts.get(row.studentCode) ?? 0) + 1), new Map())
  const emailCounts = rows.reduce<Map<string, number>>((counts, row) => counts.set(row.email, (counts.get(row.email) ?? 0) + 1), new Map())
  const classified = rows.map((row, index) => {
    const student = byCode.get(row.studentCode)
    const emailOwner = byEmail.get(row.email)
    const duplicateInFile = (codeCounts.get(row.studentCode) ?? 0) > 1 || (emailCounts.get(row.email) ?? 0) > 1
    const status: 'NEW' | 'UNCHANGED' | 'CONFLICT' | 'INVALID' = duplicateInFile ? 'INVALID' : !student ? emailOwner ? 'CONFLICT' : 'NEW' : student.firstNameTh === row.firstNameTh && student.lastNameTh === row.lastNameTh && student.user.normalizedEmail === row.email ? 'UNCHANGED' : 'CONFLICT'
    return { rowNo: index + 2, status, normalizedData: row as unknown as Prisma.InputJsonValue, observedVersion: student ? 1 : null, normalizedHash: createHash('sha256').update(JSON.stringify(row)).digest('hex'), ...(status === 'INVALID' ? { errors: ['Duplicate studentCode or email in import file'] as unknown as Prisma.InputJsonValue } : {}) }
  })
  const checksum = createHash('sha256').update(input.content).digest('hex')
  const existingJob = await db.importJob.findUnique({
    where: { requestedById_kind_sourceChecksum: { requestedById: actor.userId, kind: `STUDENT:${input.coopTermId}`, sourceChecksum: checksum } },
    include: { rows: { orderBy: { rowNo: 'asc' } } },
  })
  if (existingJob) {
    const counts = existingJob.rows.reduce<Record<string, number>>((result, row) => ({ ...result, [row.status]: (result[row.status] ?? 0) + 1 }), {})
    return { id: existingJob.id, previewHash: hashNormalizedRows(existingJob.rows.map(row => row.normalizedData)), counts }
  }
  const objectKey = `imports/${actor.userId}/${randomUUID()}${input.extension}`
  const client = new S3Client({ endpoint: input.storage.endpoint, region: input.storage.region, forcePathStyle: Boolean(input.storage.endpoint), ...(input.storage.accessKeyId && input.storage.secretAccessKey ? { credentials: { accessKeyId: input.storage.accessKeyId, secretAccessKey: input.storage.secretAccessKey } } : {}) })
  await client.send(new PutObjectCommand({ Bucket: input.storage.bucket, Key: objectKey, Body: input.content, ContentType: input.mimeType }))
  try {
    const job = await db.importJob.create({ data: {
      requestedById: actor.userId, kind: `STUDENT:${input.coopTermId}`, sourceChecksum: checksum, status: 'PREVIEW_READY', totalRows: classified.length,
      sourceFileVersion: { create: { revision: 1, objectKey, checksumSha256: checksum, mimeType: input.mimeType, extension: input.extension, sizeBytes: input.content.byteLength, scanStatus: 'CLEAN', createdById: actor.userId, file: { create: { originalFilename: input.filename, createdById: actor.userId } } } },
      rows: { create: classified },
    } })
    const counts = classified.reduce<Record<string, number>>((result, row) => ({ ...result, [row.status]: (result[row.status] ?? 0) + 1 }), {})
    return { id: job.id, previewHash: hashNormalizedRows(classified.map(row => row.normalizedData)), counts }
  } catch (error) {
    await client.send(new DeleteObjectCommand({ Bucket: input.storage.bucket, Key: objectKey })).catch(() => undefined)
    if (isUniqueConstraintError(error)) {
      const racedJob = await db.importJob.findUnique({
        where: { requestedById_kind_sourceChecksum: { requestedById: actor.userId, kind: `STUDENT:${input.coopTermId}`, sourceChecksum: checksum } },
        include: { rows: { orderBy: { rowNo: 'asc' } } },
      })
      if (racedJob) {
        const counts = racedJob.rows.reduce<Record<string, number>>((result, row) => ({ ...result, [row.status]: (result[row.status] ?? 0) + 1 }), {})
        return { id: racedJob.id, previewHash: hashNormalizedRows(racedJob.rows.map(row => row.normalizedData)), counts }
      }
    }
    throw error
  }
}

export async function confirmStudentImport(db: PrismaClient, actor: SessionActor, input: { importId: string, previewHash: string, acceptedRowNumbers: number[], coopTermId: string }): Promise<{ id: string, imported: number }> {
  requireRole(actor, 'LECTURER', 'ADMIN')
  const job = await db.importJob.findUnique({ where: { id: input.importId }, include: { rows: { orderBy: { rowNo: 'asc' } } } })
  if (!job || job.requestedById !== actor.userId) throw new DomainError('NOT_FOUND', 'Import job was not found')
  if (job.kind !== `STUDENT:${input.coopTermId}`) throw new DomainError('CONFLICT', 'Import term does not match the preview')
  const term = await db.coopTerm.findUnique({ where: { id: input.coopTermId }, select: { isActive: true } })
  if (!term || (actor.role === 'LECTURER' && !term.isActive)) throw new DomainError('FORBIDDEN', 'Import is outside your permitted term scope')
  if (hashNormalizedRows(job.rows.map(row => row.normalizedData as Record<string, unknown>)) !== input.previewHash) throw new DomainError('CONFLICT', 'Import preview changed; preview it again')
  if (job.status === 'COMPLETED') return { id: job.id, imported: job.processedRows }
  if (!['PREVIEW_READY', 'CONFIRMING', 'FAILED'].includes(job.status)) throw new DomainError('INVALID_STATE', 'Import is not ready for confirmation')
  const accepted = new Set(input.acceptedRowNumbers)
  const rows = job.rows.filter(row => accepted.has(row.rowNo) && row.status !== 'IMPORTED')
  if (rows.some(row => row.status === 'CONFLICT' || row.status === 'INVALID')) throw new DomainError('VALIDATION_FAILED', 'Conflict or invalid rows cannot be imported without explicit correction')
  const staleBefore = new Date(Date.now() - 15 * 60_000)
  const claimed = await db.importJob.updateMany({
    where: {
      id: job.id,
      OR: [
        { status: { in: ['PREVIEW_READY', 'FAILED'] } },
        { status: 'CONFIRMING', updatedAt: { lt: staleBefore } },
      ],
    },
    data: { status: 'CONFIRMING', failureReason: null },
  })
  if (claimed.count !== 1) {
    const current = await db.importJob.findUnique({ where: { id: job.id }, select: { status: true, processedRows: true } })
    if (current?.status === 'COMPLETED') return { id: job.id, imported: current.processedRows }
    throw new DomainError('CONFLICT', 'Import confirmation is already being processed')
  }
  try {
    for (let offset = 0; offset < rows.length; offset += 250) {
      const chunk = rows.slice(offset, offset + 250)
      await db.$transaction(async (tx) => {
        for (const row of chunk) {
          const data = row.normalizedData as unknown as StudentImportRow
          if (row.status === 'UNCHANGED') {
            const student = await tx.studentProfile.findUnique({ where: { studentCode: data.studentCode }, include: { user: { select: { normalizedEmail: true } } } })
            if (!student
              || student.firstNameTh !== data.firstNameTh
              || student.lastNameTh !== data.lastNameTh
              || student.user.normalizedEmail !== data.email) {
              throw new DomainError('CONFLICT', `Student ${data.studentCode} changed after preview`)
            }
            await tx.studentTermEnrollment.upsert({
              where: { studentId_coopTermId: { studentId: student.id, coopTermId: input.coopTermId } },
              create: { studentId: student.id, coopTermId: input.coopTermId },
              update: {},
            })
            await tx.importRow.update({ where: { id: row.id }, data: { status: 'IMPORTED', importedEntityId: student.userId } })
            continue
          }
          const newlyConflicting = await tx.studentProfile.findUnique({ where: { studentCode: data.studentCode }, select: { id: true } })
          if (newlyConflicting) throw new DomainError('CONFLICT', `Student ${data.studentCode} was created after preview`)
          const emailConflict = await tx.user.findUnique({ where: { normalizedEmail: data.email }, select: { id: true } })
          if (emailConflict) throw new DomainError('CONFLICT', `Email ${data.email} was used after preview`)
          const passwordHash = await bcrypt.hash(randomBytes(32).toString('base64url'), 12)
          const user = await tx.user.create({ data: { identifier: data.email, normalizedIdentifier: data.email, email: data.email, normalizedEmail: data.email, passwordHash, role: 'STUDENT', status: 'PENDING', studentProfile: { create: { studentCode: data.studentCode, firstNameTh: data.firstNameTh, lastNameTh: data.lastNameTh } } }, include: { studentProfile: true } })
          await tx.studentTermEnrollment.create({ data: { studentId: user.studentProfile!.id, coopTermId: input.coopTermId } })
          await tx.importRow.update({ where: { id: row.id }, data: { status: 'IMPORTED', importedEntityId: user.id } })
        }
        await tx.importJob.update({ where: { id: job.id }, data: { processedRows: { increment: chunk.length } } })
      })
    }
  } catch (error) {
    await db.importJob.updateMany({ where: { id: job.id, status: 'CONFIRMING' }, data: { status: 'FAILED', failureReason: error instanceof Error ? error.message.slice(0, 1_000) : 'Import failed' } })
    throw error
  }
  const completed = await db.importJob.update({ where: { id: job.id }, data: { status: 'COMPLETED', confirmedAt: new Date(), failureReason: null }, select: { processedRows: true } })
  return { id: job.id, imported: completed.processedRows }
}
