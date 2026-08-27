import { randomUUID } from 'node:crypto'
import type { Prisma } from '@prisma/client'
import { defineEventHandler, readBody } from 'h3'
import { adminNotificationCreateSchema } from '../../../shared/schemas/notification'
import { DomainError } from '../../domain/errors'
import { requireRole } from '../../policies/authorization'
import { getCorrelationId, getSessionActor, parseStrict, toHttpError } from '../../utils/http'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const correlationId = getCorrelationId(event)
  try {
    const actor = await getSessionActor(event); requireRole(actor, 'ADMIN'); const body = parseStrict(adminNotificationCreateSchema, await readBody(event))
    return await prisma.$transaction(async (tx) => {
      const recipient = await tx.user.findFirst({ where: { id: body.recipientId, status: { in: ['PENDING', 'ACTIVE'] } }, select: { id: true } })
      if (!recipient) throw new DomainError('NOT_FOUND', 'Notification recipient was not found')
      const notification = await tx.notification.create({ data: body })
      await tx.auditLog.create({ data: { actorId: actor.userId, action: 'NOTIFICATION_CREATED', entityType: 'Notification', entityId: notification.id, requestId: randomUUID(), afterData: body as Prisma.InputJsonValue } })
      return notification
    })
  } catch (error) { return toHttpError(error, correlationId) }
})
