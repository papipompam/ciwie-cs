export type DomainErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'INVALID_STATE'
  | 'CONFLICT'
  | 'VALIDATION_FAILED'
  | 'PAYLOAD_TOO_LARGE'
  | 'RATE_LIMITED'
  | 'DEPENDENCY_UNAVAILABLE'

const STATUS_BY_CODE: Record<DomainErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INVALID_STATE: 409,
  CONFLICT: 409,
  VALIDATION_FAILED: 422,
  PAYLOAD_TOO_LARGE: 413,
  RATE_LIMITED: 429,
  DEPENDENCY_UNAVAILABLE: 503,
}

export class DomainError extends Error {
  readonly statusCode: number

  constructor(
    readonly code: DomainErrorCode,
    message: string,
    readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message)
    this.name = 'DomainError'
    this.statusCode = STATUS_BY_CODE[code]
  }
}

export function isUniqueConstraintError(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'P2002')
}
