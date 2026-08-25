export const ROLES = ['STUDENT', 'LECTURER', 'ADMIN'] as const
export const APPLICATION_STATUSES = [
  'SUBMITTED',
  'WAITING_RESPONSE',
  'INTERVIEW_PENDING',
  'PRELIMINARY_ACCEPTED',
  'REJECTED',
  'CANCELLED',
] as const
export const RESPONSE_STATUSES = ['DRAFT', 'PENDING_REVIEW', 'CONFIRMED'] as const
export const RESPONSE_RESULTS = ['ACCEPTED', 'DECLINED'] as const
export const VISIT_STATUSES = ['SCHEDULED', 'POSTPONED', 'COMPLETED', 'CANCELLED'] as const
export const VISIT_PERIODS = ['MORNING', 'AFTERNOON'] as const
export const EVALUATION_STATUSES = ['DRAFT', 'SUBMITTED'] as const
export const EVALUATION_SUBJECTS = ['STUDENT', 'ORGANIZATION'] as const
export const FILE_SCAN_STATUSES = ['UPLOADED', 'PENDING_SCAN', 'CLEAN', 'REJECTED'] as const
export const IMPORT_ROW_RESULTS = ['NEW', 'UNCHANGED', 'CONFLICT', 'INVALID'] as const
export const PAGE_SIZES = [10, 20, 50, 100] as const
export const MAX_IMPORT_ROWS = 5_000
export const DEFAULT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024

export type Role = (typeof ROLES)[number]
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]
export type ResponseStatus = (typeof RESPONSE_STATUSES)[number]
export type VisitStatus = (typeof VISIT_STATUSES)[number]
