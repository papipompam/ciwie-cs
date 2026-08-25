import { extname } from 'node:path'
import { DEFAULT_MAX_UPLOAD_BYTES } from '../../shared/constants/domain'
import { DomainError } from './errors'

export interface UploadedFileDescriptor {
  filename: string
  mimeType: string
  size: number
  head: Uint8Array
}

const allowed = {
  '.csv': ['text/csv', 'application/csv', 'text/plain'],
  '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  '.pdf': ['application/pdf'],
} as const

function hasPrefix(bytes: Uint8Array, prefix: readonly number[]): boolean {
  return prefix.every((value, index) => bytes[index] === value)
}

export function validateUploadedFile(
  file: UploadedFileDescriptor,
  options: { extensions?: readonly (keyof typeof allowed)[], maxBytes?: number } = {},
): void {
  const extension = extname(file.filename).toLowerCase() as keyof typeof allowed
  const extensions = options.extensions ?? ['.csv', '.xlsx', '.pdf']
  if (!extensions.includes(extension) || !allowed[extension]) {
    throw new DomainError('VALIDATION_FAILED', 'File extension is not allowed')
  }
  if (file.size <= 0 || file.size > (options.maxBytes ?? DEFAULT_MAX_UPLOAD_BYTES)) {
    throw new DomainError('VALIDATION_FAILED', 'File size is outside the allowed limit')
  }
  if (!(allowed[extension] as readonly string[]).includes(file.mimeType.toLowerCase())) {
    throw new DomainError('VALIDATION_FAILED', 'File MIME type does not match the allowed type')
  }
  const signatureMatches = extension === '.pdf'
    ? hasPrefix(file.head, [0x25, 0x50, 0x44, 0x46])
    : extension === '.xlsx'
      ? hasPrefix(file.head, [0x50, 0x4B, 0x03, 0x04])
      : !hasPrefix(file.head, [0x4D, 0x5A]) && !hasPrefix(file.head, [0x7F, 0x45, 0x4C, 0x46])
  if (!signatureMatches) throw new DomainError('VALIDATION_FAILED', 'File signature does not match its extension')
}

export function sanitizeOriginalFilename(filename: string): string {
  const safe = [...filename.normalize('NFKC')]
    .map(character => character === '/' || character === '\\' || character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127 ? '_' : character)
    .join('')
  return safe.slice(0, 255) || 'upload'
}
