import { IncomingMessage, ServerResponse } from 'node:http'
import { Socket } from 'node:net'
import { createEvent, isError } from 'h3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getDatabase, resetDatabaseSingletonForTests } from '../../server/database/client'
import { runMigrations } from '../../server/database/migrate'
import { createTestResetToken, createTestTrip, seedDatabase } from '../../server/database/seed'
import { DEFAULT_DRIVER_EMAIL, DEFAULT_DRIVER_SECRET } from '../../server/database/seed-data'
import { DomainError } from '../../server/utils/domain-error'
import { hashTokenSha256 } from '../../server/utils/password'
import { resetRateLimitForTests } from '../../server/utils/rate-limiter'
import {
  SESSION_COOKIE_NAME,
  clearDriverSession,
  getSessionDriverId,
  requireAuthenticatedDriverId,
  setDriverSession,
} from '../../server/utils/session'

const VALID_TEST_SECRET = ['teste', 'unitario', 'sessao', 'estrada', 'mais', '2026'].join('-')
const HANDLER_NEW_CREDENTIAL = ['NovaSenhaHandler', '2026'].join('@')

function createJsonEvent(options: {
  method: 'GET' | 'POST'
  url: string
  body?: Record<string, unknown>
  headers?: Record<string, string>
}) {
  const socket = new Socket()
  const req = new IncomingMessage(socket)
  req.method = options.method
  req.url = options.url
  req.headers = { ...options.headers }
  if (options.body) {
    const serialized = JSON.stringify(options.body)
    req.headers['content-type'] = 'application/json'
    req.headers['content-length'] = String(Buffer.byteLength(serialized))
    req.push(serialized)
  }
  req.push(null)
  const res = new ServerResponse(req)
  return { event: createEvent(req, res), res }
}

function extractCookiePair(res: ServerResponse, cookieName: string): string {
  const header = res.getHeader('set-cookie')
  let items: string[] = []
  if (Array.isArray(header)) {
    items = header
  } else if (typeof header === 'string') {
    items = [header]
  }
  const match = items.find((item) => item.startsWith(`${cookieName}=`))
  return match?.split(';')[0] ?? ''
}

function extractHttpStatus(caught: unknown): number {
  if (isError(caught)) {
    return caught.statusCode
  }
  return 0
}

describe('Sessão Selada e Handlers HTTP (/api/auth/* e /api/health)', () => {
  beforeEach(() => {
    resetRateLimitForTests()
    vi.stubGlobal('useRuntimeConfig', () => ({
      appSecret: VALID_TEST_SECRET,
      databaseUrl: ':memory:',
      smtp: { host: '', port: 587, user: '', pass: '', from: '' },
      public: { appUrl: 'https://app.estradamais.com.br' },
    }))
  })

  afterEach(() => {
    resetRateLimitForTests()
    resetDatabaseSingletonForTests()
    vi.unstubAllGlobals()
  })

  it('deve gerenciar sessão selada com flags HttpOnly/SameSite/Secure adequadas', async () => {
    const { event: httpsEvent, res: httpsRes } = createJsonEvent({
      method: 'POST',
      url: '/api/auth/login',
      headers: { 'x-forwarded-proto': 'https', host: 'app.estradamais.com.br' },
    })
    await setDriverSession(httpsEvent, 1)
    const httpsSetCookie = String(httpsRes.getHeader('set-cookie'))
    expect(httpsSetCookie).toContain(`${SESSION_COOKIE_NAME}=`)
    expect(httpsSetCookie).toContain('HttpOnly')
    expect(httpsSetCookie).toContain('SameSite=Lax')
    expect(httpsSetCookie).toContain('Secure')

    const { event: httpEvent, res: httpRes } = createJsonEvent({
      method: 'POST',
      url: '/api/auth/login',
      headers: { 'x-forwarded-proto': 'http', host: 'app.estradamais.com.br' },
    })
    await setDriverSession(httpEvent, 1)
    expect(String(httpRes.getHeader('set-cookie'))).not.toContain('Secure')

    const tamperedCall = createJsonEvent({
      method: 'GET',
      url: '/api/auth/me',
      headers: { cookie: `${SESSION_COOKIE_NAME}=token-adulterado` },
    })
    await expect(getSessionDriverId(tamperedCall.event)).resolves.toBeNull()
    await expect(requireAuthenticatedDriverId(tamperedCall.event)).rejects.toBeInstanceOf(
      DomainError,
    )
    await clearDriverSession(tamperedCall.event)
  })

  it('deve executar login, me, health autenticado e logout com cookie nuxt-session', async () => {
    const singletonDb = getDatabase()
    runMigrations(singletonDb)
    await seedDatabase(singletonDb)
    createTestTrip(singletonDb, 1, { tripDate: '2026-09-18' })

    const { default: loginHandler } = await import('../../server/api/auth/login.post')
    const { default: meHandler } = await import('../../server/api/auth/me.get')
    const { default: logoutHandler } = await import('../../server/api/auth/logout.post')
    const { default: healthHandler } = await import('../../server/api/health.get')

    const loginCall = createJsonEvent({
      method: 'POST',
      url: '/api/auth/login',
      headers: { host: 'localhost:3000' },
      body: { email: DEFAULT_DRIVER_EMAIL, password: DEFAULT_DRIVER_SECRET },
    })
    const loginResult = await loginHandler(loginCall.event)
    expect(loginResult.data.email).toBe(DEFAULT_DRIVER_EMAIL)

    const sessionCookie = extractCookiePair(loginCall.res, SESSION_COOKIE_NAME)
    expect(sessionCookie).toContain(`${SESSION_COOKIE_NAME}=`)
    expect(String(loginCall.res.getHeader('set-cookie'))).not.toContain('Secure')

    const meCall = createJsonEvent({
      method: 'GET',
      url: '/api/auth/me',
      headers: { cookie: sessionCookie },
    })
    const meResult = await meHandler(meCall.event)
    expect(meResult.data.initials).toBe('VS')

    const healthCall = createJsonEvent({
      method: 'GET',
      url: '/api/health?month=2026-09',
      headers: { cookie: sessionCookie },
    })
    const healthResult = await healthHandler(healthCall.event)
    expect(healthResult.navigationCounts?.tripsCount).toBeGreaterThanOrEqual(6)

    const unauthMeCall = createJsonEvent({ method: 'GET', url: '/api/auth/me' })
    const unauthStatus = await meHandler(unauthMeCall.event).catch(extractHttpStatus)
    expect(unauthStatus).toBe(401)

    const invalidLoginCall = createJsonEvent({
      method: 'POST',
      url: '/api/auth/login',
      body: { email: 'invalido', password: '123' },
    })
    await expect(loginHandler(invalidLoginCall.event)).rejects.toMatchObject({ statusCode: 400 })

    const logoutCall = createJsonEvent({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { cookie: sessionCookie },
    })
    const logoutResult = await logoutHandler(logoutCall.event)
    expect(logoutResult).toEqual({ success: true })
    expect(String(logoutCall.res.getHeader('set-cookie'))).toContain('Max-Age=0')
  })

  it('deve validar e executar forgot-password, reset-password e fallback de runtimeConfig', async () => {
    const singletonDb = getDatabase()
    runMigrations(singletonDb)
    await seedDatabase(singletonDb)

    const { default: forgotHandler } = await import('../../server/api/auth/forgot-password.post')
    const { default: resetHandler } = await import('../../server/api/auth/reset-password.post')

    const forgotCall = createJsonEvent({
      method: 'POST',
      url: '/api/auth/forgot-password',
      body: { email: 'desconhecido@estrada.com.br' },
    })
    expect(await forgotHandler(forgotCall.event)).toMatchObject({ success: true })

    const failedResetCall = createJsonEvent({
      method: 'POST',
      url: '/api/auth/reset-password',
      body: {
        token: 'd'.repeat(64),
        password: HANDLER_NEW_CREDENTIAL,
        confirmPassword: HANDLER_NEW_CREDENTIAL,
      },
    })
    const resetErrorStatus = await resetHandler(failedResetCall.event).catch(extractHttpStatus)
    expect(resetErrorStatus).toBe(400)

    const validTokenForHandler = 'e'.repeat(64)
    createTestResetToken(singletonDb, 1, {
      tokenHash: hashTokenSha256(validTokenForHandler),
      expiresAt: '2099-01-01T00:00:00.000Z',
    })
    const validResetCall = createJsonEvent({
      method: 'POST',
      url: '/api/auth/reset-password',
      body: {
        token: validTokenForHandler,
        password: HANDLER_NEW_CREDENTIAL,
        confirmPassword: HANDLER_NEW_CREDENTIAL,
      },
    })
    expect(await resetHandler(validResetCall.event)).toEqual({
      success: true,
      message: 'Senha redefinida com sucesso.',
    })

    vi.stubGlobal('useRuntimeConfig', () => {
      throw new Error('fora do contexto nitro')
    })
    const fallbackSessionCall = createJsonEvent({
      method: 'POST',
      url: '/api/auth/login',
      headers: { host: 'localhost:3000' },
    })
    await setDriverSession(fallbackSessionCall.event, 1)
    expect(extractCookiePair(fallbackSessionCall.res, SESSION_COOKIE_NAME)).toContain(
      `${SESSION_COOKIE_NAME}=`,
    )

    const fallbackForgotCall = createJsonEvent({
      method: 'POST',
      url: '/api/auth/forgot-password',
      body: { email: 'inexistente@estrada.com.br' },
    })
    await expect(forgotHandler(fallbackForgotCall.event)).resolves.toMatchObject({ success: true })

    const invalidForgotCall = createJsonEvent({
      method: 'POST',
      url: '/api/auth/forgot-password',
      body: { email: 'nao-e-email' },
    })
    await expect(forgotHandler(invalidForgotCall.event)).rejects.toMatchObject({ statusCode: 400 })
  })
})
