import type { AsyncData, NuxtError, UseFetchOptions } from 'nuxt/app'

export function useApiFetch<DataT>(
  url: string | Request | Ref<string | Request> | (() => string | Request),
  options?: UseFetchOptions<DataT>,
): AsyncData<DataT | undefined, NuxtError<unknown> | undefined> {
  const config = useRuntimeConfig()
  const ssrHeaders = import.meta.server ? useRequestHeaders(['cookie', 'authorization']) : undefined
  const customHeaders = (options?.headers as Record<string, string> | undefined) ?? {}

  return useFetch(url, {
    baseURL: config.public.apiBase,
    ...options,
    headers: {
      ...ssrHeaders,
      ...customHeaders,
    },
  })
}
