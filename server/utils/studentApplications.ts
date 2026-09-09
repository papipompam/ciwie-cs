import type { StudentApplication, TrackedApplicationStatus as PrismaApplicationStatus } from '@prisma/client'
import type { StudentApplicationRecord, TrackedApplicationStatus } from '#shared/student-applications'

const statusFromPrisma: Record<PrismaApplicationStatus, TrackedApplicationStatus> = {
  SUBMITTED: 'submitted',
  WAITING_RESPONSE: 'waiting-response',
  RESPONDED: 'responded',
  WAITING_INTERVIEW: 'waiting-interview',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
}

export const statusToPrisma: Record<TrackedApplicationStatus, PrismaApplicationStatus> = {
  submitted: 'SUBMITTED',
  'waiting-response': 'WAITING_RESPONSE',
  responded: 'RESPONDED',
  'waiting-interview': 'WAITING_INTERVIEW',
  accepted: 'ACCEPTED',
  rejected: 'REJECTED',
  completed: 'COMPLETED',
  cancelled: 'CANCELLED',
}

export const bangkokCalendarDate = (now = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now)
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return new Date(`${value.year}-${value.month}-${value.day}T00:00:00.000Z`)
}

export const toStudentApplicationRecord = (application: StudentApplication, studentCode: string, placementRequestId?: string): StudentApplicationRecord => ({
  id: application.id,
  placementRequestId,
  studentId: studentCode,
  companyName: application.companyNameSnapshot,
  position: application.positionTitle,
  companyLocation: application.companyLocation ?? application.letterAddressSnapshot,
  recipientName: application.recipientNameSnapshot,
  letterAddress: application.letterAddressSnapshot,
  latitude: application.latitude === null ? null : Number(application.latitude),
  longitude: application.longitude === null ? null : Number(application.longitude),
  province: application.provinceSnapshot,
  appliedAt: application.appliedDate.toISOString().slice(0, 10),
  status: statusFromPrisma[application.status],
  updatedAt: application.updatedAt.toISOString(),
})

export const getActiveEnrollment = async (studentAccountId: string) => {
  const enrollment = await usePrisma().cycleEnrollment.findFirst({
    where: {
      studentId: studentAccountId,
      enrollmentStatus: 'ACTIVE',
      cycle: { status: { in: ['OPEN_FOR_REQUESTS', 'TRAINING'] } },
    },
    select: { id: true },
    orderBy: { joinedAt: 'desc' },
  })
  if (!enrollment) throw createError({ statusCode: 409, statusMessage: 'ACTIVE_ENROLLMENT_NOT_FOUND' })
  return enrollment
}
