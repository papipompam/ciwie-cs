import type { Prisma, VisitStatus } from '@prisma/client'
import { defineEventHandler } from 'h3'
import { DomainError } from '../../domain/errors'
import { getCorrelationId, getSessionActor, toHttpError } from '../../utils/http'
import { listQuery, pageEnvelope } from '../../utils/list-query'
import { prisma } from '../../utils/prisma'
import { calculateCoverage } from '../../services/visit-service'

const visitStatuses = new Set(['SCHEDULED', 'POSTPONED', 'COMPLETED', 'CANCELLED'])

export default defineEventHandler(async (event) => {
  const correlationId = getCorrelationId(event)
  try {
    const actor = await getSessionActor(event); const query = listQuery(event)
    if (actor.role === 'LECTURER' && !actor.lecturerId) throw new DomainError('FORBIDDEN', 'Lecturer profile is required')
    if (actor.role === 'STUDENT' && !actor.studentTermId) throw new DomainError('FORBIDDEN', 'Active student enrollment is required')
    if (query.coverage) {
      const placements = await prisma.placement.findMany({
        where: { status: 'ACTIVE', ...(actor.role === 'STUDENT' ? { studentTermId: actor.studentTermId } : actor.role === 'LECTURER' ? { studentTerm: { coopTerm: { isActive: true } } } : {}) },
        include: { currentWorkSite: true, studentTerm: { include: { student: true, visitStudents: { include: { result: true, visit: { include: { workSite: true, lecturers: { include: { lecturer: true } } } } } } } } },
        orderBy: [{ confirmedAt: 'desc' }, { id: 'desc' }], take: 5_000,
      })
      const today = new Date().toISOString().slice(0, 10)
      let items = placements.flatMap(placement => [1, 2].map((round) => {
        const roundValue = round === 1 ? 'ROUND_1' : 'ROUND_2'
        const member = placement.studentTerm.visitStudents.find(item => item.visit.round === roundValue && item.visit.workSiteId === placement.currentWorkSiteId && item.visit.status !== 'CANCELLED')
        const coverage = calculateCoverage({ studentTermId: placement.studentTermId, round, visitStatus: member?.visit.status, visitDate: member?.visit.visitDate.toISOString().slice(0, 10), hasResult: Boolean(member?.result) }, today)
        return { id: member?.visit.id ?? `coverage:${placement.studentTermId}:${round}`, round, visitDate: member?.visit.visitDate ?? null, period: member?.visit.period ?? null, workSiteName: placement.currentWorkSite.name, studentName: `${placement.studentTerm.student.firstNameTh} ${placement.studentTerm.student.lastNameTh}`, lecturers: member?.visit.lecturers.map(item => `${item.lecturer.firstNameTh} ${item.lecturer.lastNameTh}`).join(', ') ?? '', status: coverage, coverage, capabilities: { reschedule: actor.role !== 'STUDENT' && member?.visit.status === 'SCHEDULED' } }
      })).filter(item => item.coverage === query.coverage)
      if (query.search) { const needle = query.search.toLocaleLowerCase('th-TH'); items = items.filter(item => [item.studentName, item.workSiteName, item.lecturers].some(value => value.toLocaleLowerCase('th-TH').includes(needle))) }
      const direction = query.order === 'desc' ? -1 : 1
      items.sort((left, right) => {
        if (!query.sort) return (right.visitDate?.getTime() ?? 0) - (left.visitDate?.getTime() ?? 0) || right.id.localeCompare(left.id)
        const leftValue = query.sort === 'round' ? left.round : query.sort === 'visitDate' ? left.visitDate?.getTime() ?? 0 : query.sort === 'period' ? left.period ?? '' : query.sort === 'workSiteName' ? left.workSiteName : query.sort === 'status' ? left.status : left.id
        const rightValue = query.sort === 'round' ? right.round : query.sort === 'visitDate' ? right.visitDate?.getTime() ?? 0 : query.sort === 'period' ? right.period ?? '' : query.sort === 'workSiteName' ? right.workSiteName : query.sort === 'status' ? right.status : right.id
        return (typeof leftValue === 'number' && typeof rightValue === 'number' ? leftValue - rightValue : String(leftValue).localeCompare(String(rightValue), 'th')) * direction || left.id.localeCompare(right.id)
      })
      const start = (query.page - 1) * query.pageSize
      return pageEnvelope(items.slice(start, start + query.pageSize), items.length, query.page, query.pageSize)
    }
    const scope: Prisma.SupervisionVisitWhereInput = actor.role === 'ADMIN' ? {} : actor.role === 'LECTURER' ? { lecturers: { some: { lecturerId: actor.lecturerId } } } : { students: { some: { studentTermId: actor.studentTermId } } }
    const status = query.status && visitStatuses.has(query.status) ? query.status as VisitStatus : undefined
    const where: Prisma.SupervisionVisitWhereInput = {
      ...scope,
      ...(status ? { status } : {}),
      ...(query.region ? { workSite: { region: query.region } } : {}),
      ...(query.province ? { workSite: { province: query.province } } : {}),
      ...(query.search ? { OR: [
        { workSite: { name: { contains: query.search } } },
        { workSite: { organization: { nameTh: { contains: query.search } } } },
        { lecturers: { some: { lecturer: { OR: [{ firstNameTh: { contains: query.search } }, { lastNameTh: { contains: query.search } }] } } } },
      ] } : {}),
    }
    const direction = query.order ?? 'asc'
    const orderBy: Prisma.SupervisionVisitOrderByWithRelationInput[] = !query.sort ? [{ visitDate: 'desc' }, { id: 'desc' }]
      : query.sort === 'round' ? [{ round: direction }, { id: 'asc' }]
        : query.sort === 'visitDate' ? [{ visitDate: direction }, { id: 'asc' }]
          : query.sort === 'period' ? [{ period: direction }, { id: 'asc' }]
            : query.sort === 'workSiteName' ? [{ workSite: { name: direction } }, { id: 'asc' }]
              : query.sort === 'status' ? [{ status: direction }, { id: 'asc' }]
                : [{ visitDate: 'desc' }, { id: 'desc' }]
    const [records, total] = await prisma.$transaction([
      prisma.supervisionVisit.findMany({ where, skip: (query.page - 1) * query.pageSize, take: query.pageSize, orderBy, include: { workSite: true, students: true, lecturers: { include: { lecturer: true } } } }), prisma.supervisionVisit.count({ where }),
    ])
    return pageEnvelope(records.map(record => ({ id: record.id, round: record.round === 'ROUND_1' ? 1 : 2, visitDate: record.visitDate, period: record.period, workSiteName: record.workSite.name, lecturers: record.lecturers.map(item => `${item.lecturer.firstNameTh} ${item.lecturer.lastNameTh}`).join(', '), status: record.status, capabilities: { reschedule: actor.role !== 'STUDENT' && record.status === 'SCHEDULED' } })), total, query.page, query.pageSize)
  } catch (error) { return toHttpError(error, correlationId) }
})
