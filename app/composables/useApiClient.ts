import type { ApiFailure } from '~/types/ui'

export class ApiClientError extends Error {
  statusCode: number
  code?: string
  fieldErrors?: Record<string, string[]>
  correlationId?: string

  constructor(statusCode: number, failure: ApiFailure) {
    super(failure.message || 'ไม่สามารถดำเนินการได้')
    this.name = 'ApiClientError'
    this.statusCode = statusCode
    this.code = failure.code
    this.fieldErrors = failure.fieldErrors
    this.correlationId = failure.correlationId
  }
}

export function useApiClient() {
  async function request<T>(url: string, options: Parameters<typeof $fetch>[1] = {}): Promise<T> {
    try {
      const method = String(options.method || 'GET').toUpperCase()
      const headers = new Headers(options.headers as HeadersInit | undefined)
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && !headers.has('Idempotency-Key')) {
        headers.set('Idempotency-Key', crypto.randomUUID())
      }
      const fetchRequest = $fetch as unknown as (requestUrl: string, requestOptions: Record<string, unknown>) => Promise<unknown>
      return await fetchRequest(url, {
        credentials: 'include',
        ...options,
        headers
      }) as T
    } catch (error: unknown) {
      const fetchError = error as { statusCode?: number, status?: number, data?: ApiFailure }
      throw new ApiClientError(fetchError.statusCode || fetchError.status || 500, fetchError.data || {})
    }
  }

  return { request }
}
