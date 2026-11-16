import { getRequestIP, type H3Event } from 'h3'

export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000
export const LOGIN_MAX_FAILURES = 5
export const FORGOT_MAX_REQUESTS = 3

const MS_PER_SECOND = 1000
const SECONDS_PER_MINUTE = 60
const MS_PER_MINUTE = SECONDS_PER_MINUTE * MS_PER_SECOND

export interface RateLimitStatus {
  allowed: boolean
  remainingAttempts: number
  retryAfterMs: number
}

const attemptTimestampsByKey = new Map<string, number[]>()

function normalizeIp(ip: string): string {
  const trimmed = ip.trim()
  return trimmed.length > 0 ? trimmed : 'unknown'
}

function pruneExpiredTimestamps(key: string, cutoffMs: number): number[] {
  const existing = attemptTimestampsByKey.get(key)
  if (!existing || existing.length === 0) {
    return []
  }

  const active = existing.filter((timestamp) => timestamp > cutoffMs)
  if (active.length === 0) {
    attemptTimestampsByKey.delete(key)
  } else if (active.length !== existing.length) {
    attemptTimestampsByKey.set(key, active)
  }

  return active
}

/**
 * Extrai o endereço IP do cliente da requisição HTTP com suporte a proxy reverso.
 */
export function getClientIp(event: H3Event): string {
  return normalizeIp(getRequestIP(event, { xForwardedFor: true }) ?? 'unknown')
}

/**
 * Monta a chave isolada de rate limit para tentativas de login por IP e e-mail normalizado.
 */
export function buildLoginRateLimitKey(ip: string, email: string): string {
  return `login:${normalizeIp(ip)}:${email.trim().toLowerCase()}`
}

/**
 * Monta a chave de rate limit para solicitações de recuperação de senha por IP.
 */
export function buildForgotRateLimitKey(ip: string): string {
  return `forgot:${normalizeIp(ip)}`
}

/**
 * Verifica se a chave ainda possui tentativas disponíveis dentro da janela deslizante.
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs = RATE_LIMIT_WINDOW_MS,
  now = Date.now(),
): RateLimitStatus {
  const active = pruneExpiredTimestamps(key, now - windowMs)

  if (active.length >= maxAttempts) {
    const oldest = active[0] ?? now
    const retryAfterMs = Math.max(MS_PER_SECOND, oldest + windowMs - now)
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterMs,
    }
  }

  return {
    allowed: true,
    remainingAttempts: maxAttempts - active.length,
    retryAfterMs: 0,
  }
}

/**
 * Registra uma nova tentativa na janela deslizante e retorna a contagem ativa.
 */
export function recordRateLimitAttempt(
  key: string,
  windowMs = RATE_LIMIT_WINDOW_MS,
  now = Date.now(),
): number {
  const active = pruneExpiredTimestamps(key, now - windowMs)
  const updated = [...active, now]
  attemptTimestampsByKey.set(key, updated)
  return updated.length
}

/**
 * Remove os registros de falha acumulados para a chave após autenticação bem-sucedida.
 */
export function clearRateLimitKey(key: string): void {
  attemptTimestampsByKey.delete(key)
}

/**
 * Formata o tempo restante de bloqueio em português brasileiro legível para mensagens HTTP 429.
 */
export function formatRetryAfterPtBr(retryAfterMs: number): string {
  if (retryAfterMs >= MS_PER_MINUTE) {
    const minutes = Math.ceil(retryAfterMs / MS_PER_MINUTE)
    return minutes === 1 ? '1 minuto' : `${minutes} minutos`
  }

  const seconds = Math.max(1, Math.ceil(retryAfterMs / MS_PER_SECOND))
  return seconds === 1 ? '1 segundo' : `${seconds} segundos`
}

/**
 * Limpa todo o estado em memória do rate limiter exclusivamente para isolamento de testes.
 */
export function resetRateLimitForTests(): void {
  attemptTimestampsByKey.clear()
}
