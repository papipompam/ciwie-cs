import { z } from 'zod'
import type { StudentApplicationRecord } from './student-applications'

export const requestStatusMeta = {
  submitted: { label: 'รอออกหนังสือ', tone: 'warning' },
  'letter-issued': { label: 'รอนักศึกษาส่งหนังสือตอบรับ', tone: 'info' },
  'signed-uploaded': { label: 'รอตรวจหนังสือตอบรับ', tone: 'warning' },
  returned: { label: 'ให้แก้ไขหนังสือตอบรับ', tone: 'danger' },
  confirmed: { label: 'ยืนยันสถานที่ฝึกงานแล้ว', tone: 'success' },
  cancelled: { label: 'ยกเลิกคำร้องแล้ว', tone: 'neutral' },
} as const
export type RequestStatus = keyof typeof requestStatusMeta
export interface RequestDocument { name: string, dataUrl: string }
export interface PlacementRequestPreview {
  cycleId?: string
  id: string
  application: StudentApplicationRecord
  studentName: string
  status: RequestStatus
  submittedAt: string
  updatedAt: string
  letter?: RequestDocument
  signedDocument?: RequestDocument
  returnReason?: string
}
export const returnReasonSchema = z.string().trim().min(1, 'กรุณาระบุจุดที่ต้องแก้ไข').max(1000, 'ระบุไม่เกิน 1,000 ตัวอักษร')
export const pdfMetadataSchema = z.object({
  name: z.string().regex(/\.pdf$/i, 'กรุณาเลือกไฟล์ PDF'),
  size: z.number().positive('ไฟล์ว่าง').max(5 * 1024 * 1024, 'ขนาดไฟล์ต้องไม่เกิน 5 MB'),
})
export const canTransitionRequest = (status: RequestStatus, action: 'issue' | 'upload' | 'return' | 'confirm') => {
  if (action === 'issue') return status === 'submitted'
  if (action === 'upload') return status === 'letter-issued' || status === 'returned'
  return status === 'signed-uploaded'
}
