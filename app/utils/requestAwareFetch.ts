export interface AppApiFetchOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  query?: Record<string, unknown>
}

export type AppApiFetch = (request: string, options?: AppApiFetchOptions) => Promise<unknown>

/** Uses the incoming request headers during SSR, and the browser fetch client after hydration. */
export const useRequestAwareFetch = (): AppApiFetch => import.meta.server
  ? (useRequestFetch() as unknown as AppApiFetch)
  : ($fetch as unknown as AppApiFetch)

export const requestAwareFetch: AppApiFetch = (request, options) => useRequestAwareFetch()(request, options)
