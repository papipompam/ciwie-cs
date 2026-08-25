import type { H3Event } from 'h3'
import { getQuery } from 'h3'
import { paginationSchema } from '../../shared/schemas/common'
import { parseStrict } from './http'

export function listQuery(event: H3Event) {
  return parseStrict(paginationSchema, getQuery(event))
}

export function pageEnvelope<T>(items: T[], total: number, page: number, pageSize: number) {
  return { items, total, page, pageSize }
}
