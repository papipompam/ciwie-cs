import { calendarEventsResponseSchema } from '../../../shared/calendar'
import { requireUserSession } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const user = await requireUserSession(event)
  const events = await usePrisma().calendarEvent.findMany({
    where: { ownerAccountId: user.id },
    select: { id: true, title: true, description: true, startsAt: true, eventType: true },
    orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
    take: 500,
  })
  return calendarEventsResponseSchema.parse({
    events: events.map(item => ({
      id: item.id,
      title: item.title,
      description: item.description ?? '',
      date: item.startsAt.toISOString().slice(0, 10),
      type: item.eventType.toLowerCase(),
    })),
  })
})
