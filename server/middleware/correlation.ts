import { defineEventHandler, setResponseHeader } from 'h3'
import { getCorrelationId } from '../utils/http'

export default defineEventHandler((event) => {
  const correlationId = getCorrelationId(event)
  event.context.correlationId = correlationId
  setResponseHeader(event, 'x-correlation-id', correlationId)
})
