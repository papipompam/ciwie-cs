import { createHash } from 'node:crypto'
import { MAX_IMPORT_ROWS } from '../../shared/constants/domain'
import { DomainError } from '../domain/errors'
import { encodeCsvRow } from '../domain/csv'

export function normalizeStudentCode(value: string): string {
  return value.normalize('NFKC').trim().toUpperCase().replace(/\s+/g, '')
}

export function hashNormalizedRows(rows: readonly unknown[]): string {
  return createHash('sha256').update(JSON.stringify(canonicalJson(rows))).digest('hex')
}

function canonicalJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalJson)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0).map(([key, item]) => [key, canonicalJson(item)]))
  }
  return value
}

export function assertImportRowLimit(rows: readonly unknown[]): void {
  if (rows.length > MAX_IMPORT_ROWS) throw new DomainError('VALIDATION_FAILED', `Import is limited to ${MAX_IMPORT_ROWS} rows`)
}

export function createCsv(headers: readonly string[], rows: readonly (readonly unknown[])[]): string {
  return `\uFEFF${[encodeCsvRow(headers), ...rows.map(encodeCsvRow)].join('\r\n')}\r\n`
}

export function assertExportAllowed(role: 'STUDENT' | 'LECTURER' | 'ADMIN', kind: string): void {
  if (role === 'STUDENT' || (kind === 'EXPENSE' && role !== 'ADMIN')) {
    throw new DomainError('FORBIDDEN', 'This export is not available for your role')
  }
}
