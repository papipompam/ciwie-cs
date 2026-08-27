import { defineEventHandler } from 'h3'
import { getCorrelationId, getSessionActor, toHttpError } from '../../utils/http'
import { requireRole } from '../../policies/authorization'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const correlationId = getCorrelationId(event)
  try {
    const actor = await getSessionActor(event)
    requireRole(actor, 'ADMIN')
    const [total, active, pending, suspended] = await prisma.$transaction([
      prisma.studentProfile.count(),
      prisma.studentProfile.count({ where: { user: { status: 'ACTIVE' } } }),
      prisma.studentProfile.count({ where: { user: { status: 'PENDING' } } }),
      prisma.studentProfile.count({ where: { user: { status: 'SUSPENDED' } } }),
    ])
    return { total, active, pending, suspended }
  } catch (error) {
    return toHttpError(error, correlationId)
  }
})
