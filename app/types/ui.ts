export type UserRole = 'STUDENT' | 'LECTURER' | 'ADMIN'

export interface SessionUser {
  id: string
  displayName: string
  role: UserRole
  email?: string
  studentTermId?: string
  lecturerId?: string
  mustChangePassword?: boolean
}

export interface ApiEnvelope<T> {
  data: T
  meta?: {
    page?: number
    pageSize?: number
    total?: number
  }
}

export interface PageResult<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
}

export interface ApiFailure {
  code?: string
  message?: string
  fieldErrors?: Record<string, string[]>
  correlationId?: string
}

export type SortDirection = 'asc' | 'desc' | undefined

export interface ListQuery {
  search?: string
  page: number
  pageSize: number
  sort?: string
  order?: Exclude<SortDirection, undefined>
  [key: string]: string | number | undefined
}

export interface TableColumn {
  key: string
  label: string
  sortable?: boolean
  class?: string
}

export interface TableAction {
  key: string
  label: string
  icon: string
  capability?: string
  tone?: 'primary' | 'neutral' | 'danger'
}

export interface ListPageDefinition {
  title: string
  description: string
  endpoint: string
  icon: string
  roles: UserRole[]
  columns: TableColumn[]
  filters?: Array<{ key: string, label: string, options: Array<{ label: string, value: string }> }>
  actions?: TableAction[]
  primaryAction?: { label: string, icon: string, capability?: string, roles?: UserRole[] }
  exportable?: boolean
  exportKind?: 'STUDENT_ROSTER' | 'INTERNSHIP' | 'COVERAGE' | 'REQUIREMENT' | 'EXPENSE'
  exportRoles?: UserRole[]
}
