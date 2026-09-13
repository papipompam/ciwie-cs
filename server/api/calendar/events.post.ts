import { calendarEventInputSchema, calendarEventSchema } from '#shared/calendar'
import { requireUserSession } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const user = await requireUserSession(event)
  const input = calendarEventInputSchema.safeParse(await readBody(event))
  if (!input.success) throw createError({ statusCode: 400, statusMessage: 'CALENDAR_EVENT_INVALID' })
  const created = await usePrisma().calendarEvent.create({
    data: {
      title: input.data.title,
      description: input.data.description || null,
      startsAt: new Date(`${input.data.date}T00:00:00.000Z`),
      isAllDay: true,
      eventType: input.data.type.toUpperCase() as 'SUPERVISION' | 'DOCUMENT' | 'DEADLINE' | 'EVALUATION' | 'GENERAL',
      ownerAccountId: user.id,
    },
    select: { id: true, title: true, description: true, startsAt: true, eventType: true },
  })
  return calendarEventSchema.parse({
    id: created.id,
    title: created.title,
    description: created.description ?? '',
    date: created.startsAt.toISOString().slice(0, 10),
    type: created.eventType.toLowerCase(),
  })
})
