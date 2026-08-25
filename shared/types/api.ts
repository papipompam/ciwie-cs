import type { Role } from '../constants/domain'

export interface SessionActor {
  userId: string
  role: Role
  active: boolean
  sessionVersion: number
  studentTermId?: string
  lecturerId?: string
  mustChangePassword?: boolean
}

export interface ApiErrorBody {
  code: string
  message: string
  correlationId: string
  fieldErrors?: Record<string, string[]>
}

export interface PageResult<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
}
