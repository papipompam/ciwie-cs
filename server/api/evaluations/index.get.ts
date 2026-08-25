import { defineEventHandler } from 'h3'
import { DomainError } from '../../domain/errors'
import { getCorrelationId, getSessionActor, toHttpError } from '../../utils/http'
import { listQuery, pageEnvelope } from '../../utils/list-query'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const correlationId = getCorrelationId(event)
  try {
    const actor = await getSessionActor(event)
    if (actor.role === 'STUDENT') throw new DomainError('FORBIDDEN', 'Evaluation management is staff-only')
    if (actor.role === 'LECTURER' && !actor.lecturerId) throw new DomainError('FORBIDDEN', 'Lecturer profile is required')
    const query = listQuery(event)
    const visitScope = actor.role === 'LECTURER' ? { coopTerm: { isActive: true } } : {}
    const status = query.status === 'DRAFT' || query.status === 'SUBMITTED' ? query.status : undefined
    const [studentEvaluations, organizationEvaluations] = await prisma.$transaction([
      prisma.studentEvaluation.findMany({
        where: { ...(status ? { status } : {}), visitStudent: { visit: visitScope } },
        include: { template: true, templateVersion: true, visitStudent: { include: { visit: { include: { workSite: true, lecturers: true } } } } },
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        take: 5_000,
      }),
      prisma.organizationEvaluation.findMany({
        where: { ...(status ? { status } : {}), visit: visitScope },
        include: { template: true, templateVersion: true, visit: { include: { workSite: true, lecturers: true } } },
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        take: 5_000,
      }),
    ])
    let items = [
      ...studentEvaluations.map(record => ({
        id: record.id,
        subjectType: 'STUDENT',
        round: record.visitStudent.visit.round === 'ROUND_1' ? 1 : 2,
        workSiteName: record.visitStudent.visit.workSite.name,
        templateVersion: `${record.template.name} v${record.templateVersion.version}`,
        status: record.status,
        updatedAt: record.updatedAt,
        capabilities: { edit: actor.role === 'LECTURER' && record.status === 'DRAFT' && record.visitStudent.visit.lecturers.some(item => item.lecturerId === actor.lecturerId), submit: actor.role === 'LECTURER' && record.status === 'DRAFT' && record.visitStudent.visit.lecturers.some(item => item.lecturerId === actor.lecturerId), correct: actor.role === 'LECTURER' && record.status === 'SUBMITTED' },
      })),
      ...organizationEvaluations.map(record => ({
        id: record.id,
        subjectType: 'ORGANIZATION',
        round: record.visit.round === 'ROUND_1' ? 1 : 2,
        workSiteName: record.visit.workSite.name,
        templateVersion: `${record.template.name} v${record.templateVersion.version}`,
        status: record.status,
        updatedAt: record.updatedAt,
        capabilities: { edit: actor.role === 'LECTURER' && record.status === 'DRAFT' && record.visit.lecturers.some(item => item.lecturerId === actor.lecturerId), submit: actor.role === 'LECTURER' && record.status === 'DRAFT' && record.visit.lecturers.some(item => item.lecturerId === actor.lecturerId), correct: actor.role === 'LECTURER' && record.status === 'SUBMITTED' },
      })),
    ]
    if (query.search) {
      const needle = query.search.toLocaleLowerCase('th-TH')
      items = items.filter(item => [item.subjectType, item.workSiteName, item.templateVersion, item.status].some(value => String(value).toLocaleLowerCase('th-TH').includes(needle)))
    }
    const direction = query.order === 'desc' ? -1 : 1
    items.sort((left, right) => {
      if (!query.sort) return right.updatedAt.getTime() - left.updatedAt.getTime() || right.id.localeCompare(left.id)
      const leftValue = query.sort === 'round' ? left.round : query.sort === 'subjectType' ? left.subjectType : query.sort === 'workSiteName' ? left.workSiteName : query.sort === 'templateVersion' ? left.templateVersion : query.sort === 'status' ? left.status : left.updatedAt.getTime()
      const rightValue = query.sort === 'round' ? right.round : query.sort === 'subjectType' ? right.subjectType : query.sort === 'workSiteName' ? right.workSiteName : query.sort === 'templateVersion' ? right.templateVersion : query.sort === 'status' ? right.status : right.updatedAt.getTime()
      return (typeof leftValue === 'number' && typeof rightValue === 'number' ? leftValue - rightValue : String(leftValue).localeCompare(String(rightValue), 'th')) * direction || left.id.localeCompare(right.id)
    })
    const start = (query.page - 1) * query.pageSize
    return pageEnvelope(items.slice(start, start + query.pageSize), items.length, query.page, query.pageSize)
  } catch (error) {
    return toHttpError(error, correlationId)
  }
})
