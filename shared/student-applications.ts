import { z } from 'zod'

export const trackedApplicationStatuses = [
  'submitted',
  'waiting-response',
  'responded',
  'waiting-interview',
  'accepted',
  'rejected',
  'completed',
  'cancelled',
] as const

export type TrackedApplicationStatus = typeof trackedApplicationStatuses[number]

export interface StudentApplicationRecord {
  id: string
  studentId: string
  companyName: string
  position: string
  companyLocation: string
  recipientName?: string
  letterAddress?: string
  latitude?: number | null
  longitude?: number | null
  province: string
  appliedAt: string
  status: TrackedApplicationStatus
  updatedAt: string
}

export const createStudentApplicationSchema = z.object({
  companyName: z.string().trim().min(1, 'กรุณากรอกชื่อบริษัทหรือสถานประกอบการ').max(255),
  position: z.string().trim().min(1, 'กรุณากรอกตำแหน่งที่สมัคร').max(150),
  companyLocation: z.string().trim().min(1, 'กรุณากรอกที่อยู่บริษัท').max(500),
  recipientName: z.string().trim().min(1, 'กรุณาระบุชื่อหรือตำแหน่งผู้รับหนังสือ').max(255, 'ระบุผู้รับหนังสือไม่เกิน 255 ตัวอักษร'),
  letterAddress: z.string().trim().min(1, 'กรุณากรอกที่อยู่สำหรับออกหนังสือ').max(500, 'ระบุที่อยู่ไม่เกิน 500 ตัวอักษร'),
  latitude: z.number({ error: 'กรุณาปักหมุดสถานที่ฝึกสหกิจบนแผนที่' }).min(-90).max(90),
  longitude: z.number({ error: 'กรุณาปักหมุดสถานที่ฝึกสหกิจบนแผนที่' }).min(-180).max(180),
})

export type CreateStudentApplicationInput = z.infer<typeof createStudentApplicationSchema>

export const studentApplicationFormSchema = createStudentApplicationSchema.extend({
  province: z.string().trim().min(1, 'กรุณาเลือกจังหวัด'),
  appliedAt: z.iso.date({ error: 'กรุณาเลือกวันที่สมัคร' }),
  status: z.enum(trackedApplicationStatuses),
})

export const isStudentApplicationFinished = (status: TrackedApplicationStatus) =>
  status === 'rejected'

export const canCreateStudentApplication = (
  items: Array<Pick<StudentApplicationRecord, 'status'>>,
) => items.every(item => isStudentApplicationFinished(item.status))
