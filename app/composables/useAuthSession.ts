import { computed, ref, type ComputedRef, type Ref } from 'vue'
import type {
  AuthMessageResponse,
  ForgotPasswordInput,
  LoginInput,
  ResetPasswordInput,
  SessionUser,
} from '#shared/schemas/auth.schema'
import type { ApiItemResponse } from '#shared/types/domain'

export interface AuthSessionState {
  user: Ref<SessionUser | null>
  hasLoadedSession: Ref<boolean>
  isAuthenticated: ComputedRef<boolean>
  fetchSession: (force?: boolean) => Promise<SessionUser | null>
  login: (payload: LoginInput) => Promise<SessionUser>
  logout: () => Promise<void>
  requestPasswordReset: (payload: ForgotPasswordInput) => Promise<string>
  confirmPasswordReset: (payload: ResetPasswordInput) => Promise<string>
  clearSessionState: () => void
}

interface FetchErrorShape {
  data?: {
    message?: unknown
    data?: {
      message?: unknown
    }
  }
  message?: unknown
}

function pickNonEmptyString(value: unknown, allowBracketPrefix = true): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return null
  }
  if (!allowBracketPrefix && trimmed.startsWith('[')) {
    return null
  }
  return value
}

/**
 * Extrai mensagem de erro legível em pt-BR retornada pelos endpoints HTTP sem vazar prefixos técnicos.
 */
export function extractAuthErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object') {
    return fallback
  }

  const candidate = error as FetchErrorShape
  return (
    pickNonEmptyString(candidate.data?.message) ??
    pickNonEmptyString(candidate.data?.data?.message) ??
    pickNonEmptyString(candidate.message, false) ??
    fallback
  )
}

function createAuthStateRefs(): {
  user: Ref<SessionUser | null>
  hasLoadedSession: Ref<boolean>
} {
  if (typeof useState === 'function') {
    return {
      user: useState<SessionUser | null>('auth:user', () => null),
      hasLoadedSession: useState<boolean>('auth:loaded', () => false),
    }
  }

  return {
    user: ref<SessionUser | null>(null),
    hasLoadedSession: ref<boolean>(false),
  }
}

function resolveRequestFetcher(): typeof $fetch {
  if (typeof useRequestFetch === 'function') {
    return useRequestFetch()
  }
  return $fetch
}

function invalidateTelemetryCache(): void {
  if (typeof clearNuxtData === 'function') {
    clearNuxtData('telemetry-sync-health')
  }
}

async function requestPasswordReset(payload: ForgotPasswordInput): Promise<string> {
  const response = await $fetch<AuthMessageResponse>('/api/auth/forgot-password', {
    method: 'POST',
    body: payload,
  })
  return response.message
}

async function confirmPasswordReset(payload: ResetPasswordInput): Promise<string> {
  const response = await $fetch<AuthMessageResponse>('/api/auth/reset-password', {
    method: 'POST',
    body: payload,
  })
  return response.message
}

function setSessionUser(
  user: Ref<SessionUser | null>,
  hasLoadedSession: Ref<boolean>,
  nextUser: SessionUser | null,
): void {
  user.value = nextUser
  hasLoadedSession.value = true
}

/**
 * Gerencia sessão autenticada do motorista, fluxos de login/logout e recuperação de senha.
 */
export function useAuthSession(): AuthSessionState {
  const { user, hasLoadedSession } = createAuthStateRefs()
  const requestFetch = resolveRequestFetcher()
  const isAuthenticated = computed(() => user.value !== null)

  function clearSessionState(): void {
    setSessionUser(user, hasLoadedSession, null)
  }

  async function fetchSession(force = false): Promise<SessionUser | null> {
    if (!force && hasLoadedSession.value) {
      return user.value
    }
    try {
      const response = await requestFetch<ApiItemResponse<SessionUser>>('/api/auth/me')
      setSessionUser(user, hasLoadedSession, response.data)
      return response.data
    } catch {
      clearSessionState()
      return null
    }
  }

  async function login(payload: LoginInput): Promise<SessionUser> {
    const response = await $fetch<ApiItemResponse<SessionUser>>('/api/auth/login', {
      method: 'POST',
      body: payload,
    })
    setSessionUser(user, hasLoadedSession, response.data)
    invalidateTelemetryCache()
    return response.data
  }

  async function logout(): Promise<void> {
    try {
      await $fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      clearSessionState()
      invalidateTelemetryCache()
    }
  }

  return {
    user,
    hasLoadedSession,
    isAuthenticated,
    fetchSession,
    login,
    logout,
    requestPasswordReset,
    confirmPasswordReset,
    clearSessionState,
  }
}
