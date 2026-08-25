import type { EventHandlerRequest, H3Event, MultiPartData } from 'h3'
import { getRequestHeader, readMultipartFormData } from 'h3'
import { DEFAULT_MAX_UPLOAD_BYTES } from '../../shared/constants/domain'
import { DomainError } from '../domain/errors'

const MULTIPART_OVERHEAD_BYTES = 64 * 1024
const RAW_BODY_SYMBOL = Symbol.for('h3RawBody')

/**
 * Buffers a multipart request with a hard cap before H3 parses it. The cap is
 * enforced for both Content-Length and chunked requests, so validation never
 * starts after an unbounded body has already been retained in memory.
 */
export async function readBoundedMultipartFormData(
  event: H3Event<EventHandlerRequest>,
  maxFileBytes = DEFAULT_MAX_UPLOAD_BYTES,
): Promise<MultiPartData[] | undefined> {
  const maxRequestBytes = maxFileBytes + MULTIPART_OVERHEAD_BYTES
  const contentType = getRequestHeader(event, 'content-type')
  if (!contentType?.toLowerCase().startsWith('multipart/form-data')) throw new DomainError('BAD_REQUEST', 'multipart/form-data is required')
  const declaredLength = Number(getRequestHeader(event, 'content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > maxRequestBytes) {
    throw new DomainError('PAYLOAD_TOO_LARGE', `Upload request exceeds ${maxFileBytes} bytes plus multipart overhead`)
  }

  const request = event.node.req as typeof event.node.req & { [RAW_BODY_SYMBOL]?: Promise<Buffer> | Buffer }
  if (!request[RAW_BODY_SYMBOL]) {
    request[RAW_BODY_SYMBOL] = new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = []
      let received = 0
      let exceeded = false
      request.on('data', (value: Buffer | Uint8Array | string) => {
        if (exceeded) return
        const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value)
        received += chunk.byteLength
        if (received > maxRequestBytes) {
          exceeded = true
          chunks.length = 0
          reject(new DomainError('PAYLOAD_TOO_LARGE', `Upload request exceeds ${maxFileBytes} bytes plus multipart overhead`))
          return
        }
        chunks.push(chunk)
      })
      request.once('end', () => {
        if (!exceeded) resolve(Buffer.concat(chunks, received))
      })
      request.once('error', reject)
    })
  }
  await request[RAW_BODY_SYMBOL]
  return await readMultipartFormData(event)
}
