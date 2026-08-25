import { Readable } from 'node:stream'
import type { H3Event } from 'h3'
import { describe, expect, it } from 'vitest'
import type { DomainError } from '../../server/domain/errors'
import { readBoundedMultipartFormData } from '../../server/utils/multipart'

function eventFrom(chunks: Buffer[], headers: Record<string, string>): H3Event {
  const request = Readable.from(chunks) as Readable & { headers: Record<string, string>, method: string }
  request.headers = headers
  request.method = 'POST'
  return { method: 'POST', node: { req: request } } as unknown as H3Event
}

describe('bounded multipart reader', () => {
  it('rejects an oversized declared body before consuming the stream', async () => {
    const event = eventFrom([Buffer.from('unused')], { 'content-length': '70000', 'content-type': 'multipart/form-data; boundary=x' })
    await expect(readBoundedMultipartFormData(event, 10)).rejects.toMatchObject<Partial<DomainError>>({ code: 'PAYLOAD_TOO_LARGE', statusCode: 413 })
  })

  it('enforces the limit while receiving a chunked request', async () => {
    const event = eventFrom([Buffer.alloc(40_000), Buffer.alloc(40_000)], { 'transfer-encoding': 'chunked', 'content-type': 'multipart/form-data; boundary=x' })
    await expect(readBoundedMultipartFormData(event, 10)).rejects.toMatchObject<Partial<DomainError>>({ code: 'PAYLOAD_TOO_LARGE', statusCode: 413 })
  })
})
