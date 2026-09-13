export interface AppApiFetchOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  query?: Record<string, unknown>
  reload?: boolean
}

export type AppApiFetch = <T = unknown>(request: string, options?: AppApiFetchOptions) => Promise<T>

/** Uses the incoming request headers during SSR, and the browser fetch client after hydration. */
export const useRequestAwareFetch = (): AppApiFetch => import.meta.server
  ? (useRequestFetch() as unknown as AppApiFetch)
  : ($fetch as unknown as AppApiFetch)

export const reloadBrowser = () => {
  if (typeof window !== 'undefined') window.location.reload()
}

export const requestAwareFetch: AppApiFetch = async <T = unknown>(request: string, options?: AppApiFetchOptions) => {
  const { reload, ...fetchOptions } = options ?? {}
  const response = await useRequestAwareFetch()<T>(request, fetchOptions)
  if (reload ?? Boolean(options?.method && options.method !== 'GET')) reloadBrowser()
  return response
}
