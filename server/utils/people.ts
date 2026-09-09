import type { AccountStatus, RecordStatus, UserRole } from '@prisma/client'

const roleMap: Record<UserRole, 'staff' | 'lecturer' | 'student'> = { STAFF: 'staff', LECTURER: 'lecturer', STUDENT: 'student' }
const accountStatusMap: Record<AccountStatus, 'first-login' | 'active' | 'suspended' | 'terminated'> = {
  FIRST_LOGIN: 'first-login', ACTIVE: 'active', SUSPENDED: 'suspended', TERMINATED: 'terminated',
}
const recordStatusMap: Record<RecordStatus, 'active' | 'inactive'> = { ACTIVE: 'active', INACTIVE: 'inactive' }

interface PersonUserRecord {
  id: string
  username: string
  role: UserRole
  status: AccountStatus
  recordStatus: RecordStatus
  namePrefix: string
  firstName: string
  lastName: string
  gender: 'MALE' | 'FEMALE' | null
  section: string | null
  cycleEnrollments: Array<{
    cycle: { label: string }
    placementRequests: Array<{ companyNameSnapshot: string }>
  }>
  auditLogs?: Array<{
    id: bigint
    action: string
    reason: string | null
    metadata: unknown
    occurredAt: Date
    actor: { namePrefix: string, firstName: string, lastName: string } | null
  }>
}

type PersonAuditLog = NonNullable<PersonUserRecord['auditLogs']>[number]

export const toPersonRecord = (person: PersonUserRecord, auditLogs: PersonAuditLog[] = person.auditLogs ?? []) => {
  const enrollment = person.cycleEnrollments[0]
  const metadataDetail = (metadata: unknown) => {
    if (!metadata || typeof metadata !== 'object' || !('detail' in metadata)) return ''
    return typeof metadata.detail === 'string' ? metadata.detail : ''
  }
  return {
    id: person.username,
    accountId: person.id,
    type: roleMap[person.role] as 'student' | 'lecturer',
    prefix: person.namePrefix,
    firstName: person.firstName,
    lastName: person.lastName,
    ...(person.gender ? { gender: person.gender === 'MALE' ? 'male' as const : 'female' as const } : {}),
    recordStatus: recordStatusMap[person.recordStatus],
    accountStatus: accountStatusMap[person.status],
    ...(enrollment ? { cycle: enrollment.cycle.label } : {}),
    ...(person.section ? { section: person.section.startsWith('หมู่ ') ? person.section : `หมู่ ${person.section}` } : {}),
    ...(enrollment?.placementRequests[0] ? { company: enrollment.placementRequests[0].companyNameSnapshot } : {}),
    activities: auditLogs.map(log => ({
      id: log.id.toString(), action: log.action, detail: metadataDetail(log.metadata) || log.reason || '',
      actor: log.actor ? `${log.actor.namePrefix}${log.actor.firstName} ${log.actor.lastName}`.trim() : 'ระบบ',
      occurredAt: log.occurredAt.toISOString(),
    })),
  }
}

export const personSelect = {
  id: true, username: true, role: true, status: true, recordStatus: true,
  namePrefix: true, firstName: true, lastName: true, gender: true, section: true,
  cycleEnrollments: {
    where: { enrollmentStatus: 'ACTIVE' as const }, orderBy: { joinedAt: 'desc' as const }, take: 1,
    select: {
      cycle: { select: { label: true } },
      placementRequests: {
        where: { status: 'CONFIRMED' as const }, take: 1, orderBy: { confirmedAt: 'desc' as const },
        select: { companyNameSnapshot: true },
      },
    },
  },
} as const

export const personAuditSelect = {
  id: true, entityId: true, action: true, reason: true, metadata: true, occurredAt: true,
  actor: { select: { namePrefix: true, firstName: true, lastName: true } },
} as const
