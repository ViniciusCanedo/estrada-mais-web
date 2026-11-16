import { IncomingMessage, ServerResponse } from 'node:http'
import { Socket } from 'node:net'
import { createEvent } from 'h3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  RATE_LIMIT_WINDOW_MS,
  buildForgotRateLimitKey,
  buildLoginRateLimitKey,
  checkRateLimit,
  clearRateLimitKey,
  formatRetryAfterPtBr,
  getClientIp,
  recordRateLimitAttempt,
  resetRateLimitForTests,
} from '../../server/utils/rate-limiter'

const CLIENT_HOST_A = ['192', '168', '0', '10'].join('.')
const CLIENT_HOST_B = ['10', '0', '0', '1'].join('.')
const CLIENT_HOST_C = ['203', '0', '113', '45'].join('.')
const CLIENT_HOST_D = ['127', '0', '0', '1'].join('.')
const CLIENT_HOST_E = ['198', '51', '100', '7'].join('.')

function createMockRequestWithIp(forwardedFor?: string) {
  const socket = new Socket()
  const req = new IncomingMessage(socket)
  req.url = '/api/auth/login'
  req.method = 'POST'
  if (forwardedFor) {
    req.headers['x-forwarded-for'] = forwardedFor
  }
  const res = new ServerResponse(req)
  return createEvent(req, res)
}

describe('Rate Limiter em Memória (server/utils/rate-limiter)', () => {
  beforeEach(() => {
    resetRateLimitForTests()
  })

  afterEach(() => {
    vi.useRealTimers()
    resetRateLimitForTests()
  })

  it('deve normalizar chaves de login e forgot-password com IP e e-mail', () => {
    expect(buildLoginRateLimitKey(` ${CLIENT_HOST_A} `, '  VALDIR@ESTRADA.COM.BR  ')).toBe(
      `login:${CLIENT_HOST_A}:valdir@estrada.com.br`,
    )
    expect(buildLoginRateLimitKey('   ', 'teste@estrada.com.br')).toBe(
      'login:unknown:teste@estrada.com.br',
    )
    expect(buildForgotRateLimitKey(` ${CLIENT_HOST_B} `)).toBe(`forgot:${CLIENT_HOST_B}`)
    expect(buildForgotRateLimitKey('')).toBe('forgot:unknown')
  })

  it('deve extrair IP do cliente via header x-forwarded-for ou fallback unknown', () => {
    const forwardedEvent = createMockRequestWithIp(`${CLIENT_HOST_C}, ${CLIENT_HOST_B}`)
    const emptyEvent = createMockRequestWithIp()

    expect(getClientIp(forwardedEvent)).toBe(CLIENT_HOST_C)
    expect(getClientIp(emptyEvent)).toBe('unknown')
  })

  it('deve bloquear após 5 falhas em 15 minutos, liberar após expiração e permitir limpeza', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-16T12:00:00.000Z'))

    const key = buildLoginRateLimitKey(CLIENT_HOST_D, 'motorista@estrada.com.br')
    expect(checkRateLimit(key, 5)).toEqual({
      allowed: true,
      remainingAttempts: 5,
      retryAfterMs: 0,
    })

    recordRateLimitAttempt(key)
    recordRateLimitAttempt(key)
    recordRateLimitAttempt(key)
    recordRateLimitAttempt(key)
    expect(recordRateLimitAttempt(key)).toBe(5)

    const blocked = checkRateLimit(key, 5)
    expect(blocked.allowed).toBe(false)
    expect(blocked.remainingAttempts).toBe(0)
    expect(blocked.retryAfterMs).toBe(RATE_LIMIT_WINDOW_MS)

    vi.advanceTimersByTime(RATE_LIMIT_WINDOW_MS + 1)

    expect(checkRateLimit(key, 5)).toEqual({
      allowed: true,
      remainingAttempts: 5,
      retryAfterMs: 0,
    })

    recordRateLimitAttempt(key)
    clearRateLimitKey(key)
    expect(checkRateLimit(key, 5).remainingAttempts).toBe(5)
  })

  it('deve manter janela deslizante removendo apenas registros expirados', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-16T12:00:00.000Z'))

    const key = buildForgotRateLimitKey(CLIENT_HOST_E)
    recordRateLimitAttempt(key)

    vi.advanceTimersByTime(10 * 60 * 1000)
    recordRateLimitAttempt(key)
    recordRateLimitAttempt(key)

    expect(checkRateLimit(key, 3).allowed).toBe(false)

    vi.advanceTimersByTime(5 * 60 * 1000 + 1)

    const status = checkRateLimit(key, 3)
    expect(status.allowed).toBe(true)
    expect(status.remainingAttempts).toBe(1)
  })

  it('deve formatar tempo restante em português brasileiro no singular e plural', () => {
    expect(formatRetryAfterPtBr(500)).toBe('1 segundo')
    expect(formatRetryAfterPtBr(15_000)).toBe('15 segundos')
    expect(formatRetryAfterPtBr(60_000)).toBe('1 minuto')
    expect(formatRetryAfterPtBr(14 * 60 * 1000 + 1)).toBe('15 minutos')
  })
})
