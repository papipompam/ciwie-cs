import { defineEventHandler, getHeader, getRequestURL, setResponseHeaders } from 'h3'
import { DomainError } from '../domain/errors'
import { getCorrelationId, toHttpError } from '../utils/http'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export function assertSameOriginMutation(method: string, path: string, origin: string | undefined, requestOrigin: string): void {
  if (!path.startsWith('/api/') || SAFE_METHODS.has(method)) return
  if (!origin || origin !== requestOrigin) throw new DomainError('FORBIDDEN', 'A same-origin Origin header is required for mutations')
}

export default defineEventHandler((event) => {
  setResponseHeaders(event, {
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'permissions-policy': 'camera=(), microphone=(), geolocation=()',
    'content-security-policy': "default-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  })
  try {
    assertSameOriginMutation(event.method, event.path, getHeader(event, 'origin'), getRequestURL(event).origin)
  } catch (error) {
    return toHttpError(error, getCorrelationId(event))
  }
})
