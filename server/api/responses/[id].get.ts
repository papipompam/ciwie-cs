import { defineEventHandler, getRouterParam } from 'h3'
import { DomainError } from '../../domain/errors'
import { getCorrelationId, getSessionActor, toHttpError } from '../../utils/http'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const correlationId = getCorrelationId(event)
  try {
    const actor = await getSessionActor(event)
    const id = getRouterParam(event, 'id')
    const item = id
      ? await prisma.responseForm.findFirst({
          where: {
            id,
            ...(actor.role === 'STUDENT'
              ? { batch: { members: { some: { studentTermId: actor.studentTermId } } } }
              : actor.role === 'LECTURER'
                ? { batch: { coopTerm: { isActive: true } } }
                : {}),
          },
          include: {
            batch: {
              include: {
                members: { include: { studentTerm: { include: { student: true } } } },
                workSite: { include: { organization: true } },
              },
            },
            results: true,
          },
        })
      : null
    if (!item) throw new DomainError('NOT_FOUND', 'Response was not found')
    const byMember = new Map(item.results.map(result => [result.batchMemberId, result]))
    return {
      ...item,
      members: item.batch.members.map(member => ({
        batchMemberId: member.id,
        studentName: `${member.studentTerm.student.firstNameTh} ${member.studentTerm.student.lastNameTh}`,
        result: byMember.get(member.id)?.result ?? null,
      })),
    }
  } catch (error) {
    return toHttpError(error, correlationId)
  }
})
