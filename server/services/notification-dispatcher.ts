import type { Prisma, PrismaClient } from '@prisma/client'

type NotificationDb = PrismaClient | Prisma.TransactionClient

export interface NotificationRecipient { userId: string, email: string | null }

export function eventPresentation(eventType: string): { title: string, body: string } {
  if (eventType === 'VISIT_DUE_SOON') return { title: 'ใกล้ถึงวันนิเทศ', body: 'กำหนดการนิเทศจะมาถึงภายใน 1 วัน กรุณาตรวจสอบรายละเอียดในระบบ' }
  if (eventType === 'VISIT_RESULT_MISSING') return { title: 'ยังขาดผลการนิเทศ', body: 'กำหนดการนิเทศผ่านแล้วแต่ยังบันทึกผลนักศึกษาไม่ครบ' }
  if (eventType === 'EVALUATION_MISSING') return { title: 'ยังขาดแบบประเมิน', body: 'รายการนิเทศเสร็จแล้วแต่ยังส่งแบบประเมินไม่ครบ' }
  if (eventType.startsWith('VISIT_')) return { title: 'การนิเทศมีการเปลี่ยนแปลง', body: 'กรุณาตรวจสอบกำหนดการนิเทศล่าสุดในระบบ' }
  if (eventType === 'DOCUMENT_READY') return { title: 'หนังสือพร้อมแล้ว', body: 'หนังสือสหกิจศึกษาได้รับการจัดทำและพร้อมดำเนินการส่ง' }
  if (eventType === 'DELIVERY_ASSIGNED') return { title: 'ได้รับมอบหมายให้นำส่งหนังสือ', body: 'คุณได้รับมอบหมายให้นำส่งหนังสือ กรุณาตรวจสอบและบันทึกผลการส่งในระบบ' }
  if (eventType === 'DELIVERY_WAITING_RESPONSE') return { title: 'อยู่ระหว่างรอแบบตอบรับ', body: 'หนังสือถูกส่งแล้วและอยู่ระหว่างรอแบบตอบรับจากสถานประกอบการ' }
  if (eventType === 'DOCUMENT_REQUESTED') return { title: 'ส่งคำขอออกหนังสือแล้ว', body: 'ระบบได้รับคำขอออกหนังสือของคุณแล้ว' }
  if (eventType === 'DELIVERY_OVERDUE') return { title: 'การติดตามเอกสารเกินกำหนด', body: 'รายการส่งเอกสารยังไม่ได้รับแบบตอบรับ กรุณาตรวจสอบและติดตาม' }
  if (eventType === 'RESPONSE_UPLOADED') return { title: 'ได้รับแบบตอบรับแล้ว', body: 'มีแบบตอบรับใหม่รอการตรวจสอบ' }
  if (eventType === 'RESPONSE_CONFIRMED') return { title: 'ยืนยันแบบตอบรับแล้ว', body: 'ผลตอบรับและสถานที่ฝึกงานได้รับการยืนยันแล้ว' }
  if (eventType === 'DOCUMENT_DELIVERED') return { title: 'ส่งหนังสือแล้ว', body: 'หนังสือถูกส่งให้สถานประกอบการแล้ว กรุณาตรวจสอบรายละเอียดในระบบ' }
  throw new Error(`Unsupported outbox event: ${eventType}`)
}

export async function resolveEventRecipients(db: NotificationDb, eventType: string, aggregateId: string): Promise<NotificationRecipient[]> {
  if (eventType.startsWith('VISIT_')) {
    const visit = await db.supervisionVisit.findUnique({ where: { id: aggregateId }, include: { students: { include: { studentTerm: { include: { student: { include: { user: true } } } } } }, lecturers: { include: { lecturer: { include: { user: true } } } } } })
    if (!visit) return []
    const lecturers = visit.lecturers.map(item => ({ userId: item.lecturer.user.id, email: item.lecturer.user.email }))
    if (eventType === 'VISIT_RESULT_MISSING' || eventType === 'EVALUATION_MISSING') return lecturers
    return dedupeRecipients([...visit.students.map(item => ({ userId: item.studentTerm.student.user.id, email: item.studentTerm.student.user.email })), ...lecturers])
  }
  if (eventType.startsWith('RESPONSE_')) {
    const response = await db.responseForm.findUnique({ where: { id: aggregateId }, include: { batch: { include: { members: { include: { studentTerm: { include: { student: { include: { user: true } } } } } } } } } })
    const students = response?.batch.members.map(item => ({ userId: item.studentTerm.student.user.id, email: item.studentTerm.student.user.email })) ?? []
    if (eventType !== 'RESPONSE_UPLOADED') return students
    const admins = await db.user.findMany({ where: { role: 'ADMIN', status: 'ACTIVE' }, select: { id: true, email: true } })
    return dedupeRecipients([...students, ...admins.map(user => ({ userId: user.id, email: user.email }))])
  }
  if (eventType === 'DOCUMENT_READY') {
    const batch = await db.documentBatch.findUnique({ where: { id: aggregateId }, include: { members: { include: { studentTerm: { include: { student: { include: { user: true } } } } } } } })
    return batch?.members.map(item => ({ userId: item.studentTerm.student.user.id, email: item.studentTerm.student.user.email })) ?? []
  }
  if (eventType === 'DOCUMENT_REQUESTED') {
    const request = await db.documentRequest.findUnique({ where: { id: aggregateId }, include: { studentTerm: { include: { student: { include: { user: true } } } } } })
    return request ? [{ userId: request.studentTerm.student.user.id, email: request.studentTerm.student.user.email }] : []
  }
  if (eventType === 'DELIVERY_ASSIGNED' || eventType === 'DELIVERY_WAITING_RESPONSE' || eventType === 'DOCUMENT_DELIVERED' || eventType === 'DELIVERY_OVERDUE') {
    const delivery = await db.delivery.findUnique({ where: { id: aggregateId }, include: { batch: { include: { members: { include: { studentTerm: { include: { student: { include: { user: true } } } } } } } } } })
    if (!delivery) return []
    const user = await db.user.findUnique({ where: { id: delivery.ownerUserId }, select: { id: true, email: true } })
    if (eventType === 'DELIVERY_ASSIGNED') return user ? [{ userId: user.id, email: user.email }] : []
    const students = delivery.batch.members.map(item => ({ userId: item.studentTerm.student.user.id, email: item.studentTerm.student.user.email }))
    return dedupeRecipients([...(user ? [{ userId: user.id, email: user.email }] : []), ...students])
  }
  return []
}

function dedupeRecipients(recipients: NotificationRecipient[]): NotificationRecipient[] {
  return [...new Map(recipients.map(recipient => [recipient.userId, recipient])).values()]
}

export async function enqueueNotificationEvent(db: NotificationDb, input: { eventType: string, aggregateType: string, aggregateId: string, dedupeKey: string, payload: Prisma.InputJsonValue }): Promise<void> {
  await db.outboxMessage.create({ data: input })
  const presentation = eventPresentation(input.eventType)
  const recipients = await resolveEventRecipients(db, input.eventType, input.aggregateId)
  if (recipients.length) {
    await db.notification.createMany({ data: recipients.map(recipient => ({ recipientId: recipient.userId, eventType: input.eventType, title: presentation.title, body: presentation.body, entityType: input.aggregateType, entityId: input.aggregateId })) })
  }
}
