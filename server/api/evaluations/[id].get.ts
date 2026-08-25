import { defineEventHandler, getQuery, getRouterParam } from 'h3'
import { evaluationDetailQuerySchema } from '../../../shared/schemas/evaluation'
import { DomainError } from '../../domain/errors'
import { getCorrelationId, getSessionActor, parseStrict, toHttpError } from '../../utils/http'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const correlationId = getCorrelationId(event)
  try {
    const actor = await getSessionActor(event)
    const id = getRouterParam(event, 'id')
    if (!id) throw new DomainError('BAD_REQUEST', 'Evaluation id is required')
    const query = parseStrict(evaluationDetailQuerySchema, getQuery(event))

    if (actor.role === 'STUDENT') {
      if (query.subjectType === 'ORGANIZATION') throw new DomainError('NOT_FOUND', 'Evaluation was not found')
      const item = await prisma.studentEvaluation.findFirst({
        where: { id, status: 'SUBMITTED', visitStudent: { studentTermId: actor.studentTermId } },
        include: { template: { select: { name: true } }, visitStudent: { include: { visit: { include: { workSite: true } } } } },
      })
      if (!item) throw new DomainError('NOT_FOUND', 'Evaluation was not found')
      return {
        id: item.id,
        subjectType: 'STUDENT' as const,
        status: item.status,
        submittedAt: item.submittedAt,
        round: item.visitStudent.visit.round === 'ROUND_1' ? 1 : 2,
        workSiteName: item.visitStudent.visit.workSite.name,
        templateName: item.template.name,
        capabilities: { edit: false, submit: false, correct: false },
      }
    }

    if (actor.role === 'LECTURER' && !actor.lecturerId) throw new DomainError('FORBIDDEN', 'Lecturer profile is required')
    const lecturerScope = actor.role === 'LECTURER' ? { coopTerm: { isActive: true } } : {}
    if (query.subjectType !== 'ORGANIZATION') {
      const item = await prisma.studentEvaluation.findFirst({
        where: { id, visitStudent: { visit: lecturerScope } },
        include: {
          answers: { orderBy: { createdAt: 'asc' } },
          versions: { orderBy: { version: 'desc' } },
          template: { select: { name: true } },
          templateVersion: { include: { items: { orderBy: { sortOrder: 'asc' } } } },
          visitStudent: { include: { visit: { include: { workSite: true, lecturers: true } } } },
        },
      })
      if (item) {
        const canEdit = actor.role === 'LECTURER' && item.visitStudent.visit.lecturers.some(member => member.lecturerId === actor.lecturerId)
        return {
          ...item,
          subjectType: 'STUDENT' as const,
          visitId: item.visitStudent.visitId,
          round: item.visitStudent.visit.round === 'ROUND_1' ? 1 : 2,
          workSiteName: item.visitStudent.visit.workSite.name,
          templateName: item.template.name,
          templateVersion: { id: item.templateVersion.id, version: item.templateVersion.version, items: item.templateVersion.items },
          capabilities: { edit: canEdit && item.status === 'DRAFT', submit: canEdit && item.status === 'DRAFT', correct: canEdit && item.status === 'SUBMITTED' },
        }
      }
    }

    if (query.subjectType !== 'STUDENT') {
      const item = await prisma.organizationEvaluation.findFirst({
        where: { id, visit: lecturerScope },
        include: {
          answers: { orderBy: { createdAt: 'asc' } },
          versions: { orderBy: { version: 'desc' } },
          template: { select: { name: true } },
          templateVersion: { include: { items: { orderBy: { sortOrder: 'asc' } } } },
          visit: { include: { workSite: true, lecturers: true } },
        },
      })
      if (item) {
        const canEdit = actor.role === 'LECTURER' && item.visit.lecturers.some(member => member.lecturerId === actor.lecturerId)
        return {
          ...item,
          subjectType: 'ORGANIZATION' as const,
          round: item.visit.round === 'ROUND_1' ? 1 : 2,
          workSiteName: item.visit.workSite.name,
          templateName: item.template.name,
          templateVersion: { id: item.templateVersion.id, version: item.templateVersion.version, items: item.templateVersion.items },
          capabilities: { edit: canEdit && item.status === 'DRAFT', submit: canEdit && item.status === 'DRAFT', correct: canEdit && item.status === 'SUBMITTED' },
        }
      }
    }
    throw new DomainError('NOT_FOUND', 'Evaluation was not found')
  } catch (error) {
    return toHttpError(error, correlationId)
  }
})
