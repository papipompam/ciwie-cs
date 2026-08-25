import { z } from 'zod'
import { defineEventHandler, getQuery } from 'h3'
import { DomainError } from '../domain/errors'
import { getCorrelationId, getSessionActor, parseStrict, toHttpError } from '../utils/http'
import { prisma } from '../utils/prisma'

const lookupQuerySchema = z.object({
  resource: z.enum([
    'COOP_TERMS', 'ORGANIZATIONS', 'WORK_SITES', 'CONTACTS', 'LECTURERS',
    'STUDENT_TERMS', 'EVALUATION_TEMPLATES', 'DOCUMENT_BATCHES', 'DELIVERIES',
  ]),
  search: z.string().trim().max(100).optional(),
  coopTermId: z.string().uuid().optional(),
  organizationId: z.string().uuid().optional(),
  workSiteId: z.string().uuid().optional(),
  visitId: z.string().uuid().optional(),
  batchId: z.string().uuid().optional(),
  subject: z.enum(['STUDENT', 'ORGANIZATION']).optional(),
  region: z.string().trim().max(100).optional(),
  province: z.string().trim().max(100).optional(),
}).strict()

const staffOnly = (role: string): void => {
  if (role !== 'LECTURER' && role !== 'ADMIN') throw new DomainError('FORBIDDEN', 'This lookup is restricted to staff')
}

export default defineEventHandler(async (event) => {
  const correlationId = getCorrelationId(event)
  try {
    const actor = await getSessionActor(event)
    const query = parseStrict(lookupQuerySchema, getQuery(event))
    const search = query.search || undefined

    if (query.resource === 'COOP_TERMS') {
      const rows = await prisma.coopTerm.findMany({
        where: actor.role === 'STUDENT'
          ? { enrollments: { some: { id: actor.studentTermId } } }
          : { ...(query.coopTermId ? { id: query.coopTermId } : {}), ...(search ? { name: { contains: search } } : {}) },
        orderBy: [{ academicYear: 'desc' }, { semester: 'desc' }], take: 50,
      })
      return { items: rows.map(row => ({ id: row.id, label: row.name, academicYear: row.academicYear, semester: row.semester, isActive: row.isActive })) }
    }

    if (query.resource === 'ORGANIZATIONS') {
      const rows = await prisma.organization.findMany({
        where: { isActive: true, ...(search ? { OR: [{ nameTh: { contains: search } }, { nameEn: { contains: search } }, { taxId: { contains: search } }] } : {}) },
        orderBy: [{ nameTh: 'asc' }, { id: 'asc' }], take: 50,
      })
      return { items: rows.map(row => ({ id: row.id, label: row.nameTh, description: row.nameEn || row.taxId || undefined, taxId: row.taxId })) }
    }

    if (query.resource === 'WORK_SITES') {
      const rows = await prisma.workSite.findMany({
        where: {
          isActive: true, organization: { isActive: true },
          ...(query.organizationId ? { organizationId: query.organizationId } : {}),
          ...(query.region ? { region: query.region } : {}), ...(query.province ? { province: query.province } : {}),
          ...(search ? { OR: [{ name: { contains: search } }, { province: { contains: search } }, { organization: { nameTh: { contains: search } } }] } : {}),
        },
        include: { organization: { select: { nameTh: true } } }, orderBy: [{ province: 'asc' }, { name: 'asc' }], take: 50,
      })
      return { items: rows.map(row => ({ id: row.id, label: `${row.organization.nameTh} — ${row.name}`, description: `${row.province} (${row.region})`, organizationId: row.organizationId, region: row.region, province: row.province })) }
    }

    if (query.resource === 'CONTACTS') {
      const rows = await prisma.organizationContact.findMany({
        where: {
          isActive: true, ...(query.organizationId ? { organizationId: query.organizationId } : {}),
          ...(query.workSiteId ? { OR: [{ workSiteId: query.workSiteId }, { workSiteId: null }] } : {}),
          ...(search ? { OR: [{ name: { contains: search } }, { position: { contains: search } }, { email: { contains: search } }] } : {}),
        }, orderBy: [{ name: 'asc' }, { id: 'asc' }], take: 50,
      })
      return { items: rows.map(row => ({ id: row.id, label: row.name, description: row.position || row.email || row.phone || undefined, organizationId: row.organizationId, workSiteId: row.workSiteId })) }
    }

    staffOnly(actor.role)

    if (query.resource === 'LECTURERS') {
      const rows = await prisma.lecturerProfile.findMany({
        where: { user: { status: 'ACTIVE' }, ...(search ? { OR: [{ firstNameTh: { contains: search } }, { lastNameTh: { contains: search } }, { employeeCode: { contains: search } }] } : {}) },
        orderBy: [{ lastNameTh: 'asc' }, { firstNameTh: 'asc' }], take: 50,
      })
      return { items: rows.map(row => ({ id: row.id, userId: row.userId, label: `${row.firstNameTh} ${row.lastNameTh}`, description: row.employeeCode || undefined })) }
    }

    if (query.resource === 'STUDENT_TERMS') {
      const rows = await prisma.studentTermEnrollment.findMany({
        where: {
          coopTerm: query.coopTermId ? { id: query.coopTermId } : { isActive: true },
          ...(query.workSiteId ? { placement: { status: 'ACTIVE', currentWorkSiteId: query.workSiteId } } : {}),
          ...(query.visitId ? { visitStudents: { some: { visitId: query.visitId } } } : {}),
          ...(search ? { student: { OR: [{ studentCode: { contains: search } }, { firstNameTh: { contains: search } }, { lastNameTh: { contains: search } }] } } : {}),
        }, include: {
          student: true,
          coopTerm: { select: { name: true } },
          placement: { select: { currentWorkSiteId: true } },
          visitStudents: { where: query.visitId ? { visitId: query.visitId } : { id: '__none__' }, select: { id: true }, take: 1 },
        },
        orderBy: [{ student: { studentCode: 'asc' } }], take: 100,
      })
      return { items: rows.map(row => ({ id: row.id, userId: row.student.userId, visitStudentId: row.visitStudents[0]?.id, label: `${row.student.studentCode} — ${row.student.firstNameTh} ${row.student.lastNameTh}`, description: row.coopTerm.name, coopTermId: row.coopTermId, workSiteId: row.placement?.currentWorkSiteId })) }
    }

    if (query.resource === 'EVALUATION_TEMPLATES') {
      const rows = await prisma.evaluationTemplateVersion.findMany({
        where: { status: 'PUBLISHED', template: { isActive: true, ...(query.subject ? { subject: query.subject } : {}), ...(search ? { name: { contains: search } } : {}) } },
        include: { template: { select: { id: true, name: true, subject: true } } }, orderBy: [{ publishedAt: 'desc' }], take: 50,
      })
      return { items: rows.map(row => ({ id: row.id, templateVersionId: row.id, label: `${row.template.name} (v${row.version})`, templateId: row.template.id, subject: row.template.subject })) }
    }

    if (query.resource === 'DOCUMENT_BATCHES') {
      const rows = await prisma.documentBatch.findMany({
        where: { coopTerm: query.coopTermId ? { id: query.coopTermId } : { isActive: true }, ...(query.workSiteId ? { workSiteId: query.workSiteId } : {}), ...(search ? { OR: [{ documentNo: { contains: search } }, { workSite: { name: { contains: search } } }] } : {}) },
        include: { workSite: { select: { name: true } } }, orderBy: [{ createdAt: 'desc' }], take: 50,
      })
      return { items: rows.map(row => ({ id: row.id, label: row.documentNo || `${row.documentType} — ${row.workSite.name}`, status: row.status, coopTermId: row.coopTermId, workSiteId: row.workSiteId })) }
    }

    const rows = await prisma.delivery.findMany({
      where: {
        ...(query.batchId ? { batchId: query.batchId } : {}),
        batch: { coopTerm: { isActive: true } },
        ...(actor.role === 'LECTURER' ? { OR: [{ ownerUserId: actor.userId }, { batch: { coopTerm: { isActive: true } } }] } : {}),
        ...(search
          ? { OR: [{ recipient: { contains: search } }, { batch: { documentNo: { contains: search } } }] }
          : {}),
      }, include: { batch: { include: { workSite: { select: { name: true } } } } }, orderBy: [{ createdAt: 'desc' }], take: 50,
    })
    return { items: rows.map(row => ({ id: row.id, label: `${row.batch.documentNo || row.batch.documentType} — ${row.batch.workSite.name}`, status: row.status, batchId: row.batchId, ownerUserId: row.ownerUserId })) }
  } catch (error) {
    return toHttpError(error, correlationId)
  }
})
