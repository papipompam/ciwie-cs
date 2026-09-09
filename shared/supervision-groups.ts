import { z } from 'zod'

export const supervisionRoundSchema = z.coerce.number().int().refine(value => value === 1 || value === 2, 'รอบนิเทศไม่ถูกต้อง')

export const supervisionContextSchema = z.object({
  cycleId: z.string().trim().min(1).max(30),
  round: supervisionRoundSchema,
}).strict()

export const supervisionSuggestionSchema = supervisionContextSchema.extend({
  maxDistanceKm: z.coerce.number().positive().max(500),
  maxCompanies: z.coerce.number().int().min(1).max(50),
}).strict()

export const createSupervisionGroupsSchema = supervisionContextSchema.extend({
  groups: z.array(z.object({
    name: z.string().trim().min(1).max(150),
    companyIds: z.array(z.string().trim().min(1).max(30)).min(1).max(50),
  }).strict()).min(1).max(100),
}).strict()

export const assignGroupLecturersSchema = z.object({
  lecturerIds: z.array(z.string().trim().min(1).max(30)).min(1).max(20),
}).strict()

export type SupervisionRoundNumber = 1 | 2

export interface SupervisionCompanyDto {
  id: string
  cycleId: string
  name: string
  branch: string
  province: string
  region: string
  address: string
  contactName: string
  contactPhone: string
  status: 'active' | 'inactive'
  latitude: number | null
  longitude: number | null
  studentCount: number
  students: Array<{
    id: string
    studentId: string
    studentName: string
    prefix: string
    firstName: string
    lastName: string
    section: string
    position: string
  }>
}

export interface SupervisionGroupDto {
  id: string
  cycleId: string
  round: SupervisionRoundNumber
  name: string
  lecturerIds: string[]
  companyIds: string[]
  createdAt: string
}

export interface SupervisionLecturerDto {
  id: string
  name: string
  gender: 'male' | 'female' | null
}
