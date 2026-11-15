type HttpMethod =
  'GET' | 'HEAD' | 'PATCH' | 'POST' | 'PUT' | 'DELETE' | 'CONNECT' | 'OPTIONS' | 'TRACE'

declare function useRequestHeaders(include: ('cookie' | 'authorization')[]): {
  cookie?: string
  authorization?: string
}

export function resolveBaseUrl(): string {
  try {
    const config = useRuntimeConfig()
    if (typeof config.public?.apiBase === 'string' && config.public.apiBase.length > 0) {
      return config.public.apiBase
    }
  } catch {
    // Fallback fora do contexto do Nuxt (ex.: testes unitários isolados)
  }

  return '/api'
}

export function resolveSsrHeaders(isServer = Boolean(import.meta.server)): Record<string, string> {
  if (!isServer) {
    return {}
  }

  try {
    const headers = useRequestHeaders(['cookie', 'authorization'])
    const normalized: Record<string, string> = {}

    if (headers.cookie) {
      normalized.cookie = headers.cookie
    }
    if (headers.authorization) {
      normalized.authorization = headers.authorization
    }

    return normalized
  } catch {
    return {}
  }
}

export function normalizeHeaders(headers?: HeadersInit): Record<string, string> {
  if (!headers) {
    return {}
  }

  if (headers instanceof Headers) {
    const result: Record<string, string> = {}
    headers.forEach((value, key) => {
      result[key] = value
    })
    return result
  }

  if (Array.isArray(headers)) {
    return Object.fromEntries(headers)
  }

  return { ...headers }
}

export function buildFetchOptions(options?: RequestInit): Parameters<typeof $fetch>[1] {
  const method = (options?.method?.toUpperCase() ?? 'GET') as HttpMethod
  const fetchOptions: Parameters<typeof $fetch>[1] = {
    baseURL: resolveBaseUrl(),
    method,
    headers: {
      ...resolveSsrHeaders(),
      ...normalizeHeaders(options?.headers),
    },
  }

  if (options?.body != null) {
    fetchOptions.body = options.body
  }

  if (options?.signal != null) {
    fetchOptions.signal = options.signal
  }

  return fetchOptions
}

export const customFetch = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const response = await $fetch<unknown>(url, buildFetchOptions(options))

  return response as T
}
