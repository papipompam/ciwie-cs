import type { Role } from '../constants/domain'

declare module '#auth-utils' {
  interface User {
    userId: string
    role: Role
    active: boolean
    sessionVersion: number
    studentTermId?: string
    lecturerId?: string
    mustChangePassword?: boolean
  }
}

export {}
