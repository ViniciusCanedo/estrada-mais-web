import {
  clearSession,
  getCookie,
  getHeader,
  useSession,
  type H3Event,
  type SessionConfig,
} from 'h3'
import { DomainError } from './domain-error'

export const SESSION_COOKIE_NAME = 'nuxt-session'
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7

const MIN_SESSION_SECRET_LENGTH = 32
const DEV_TEST_SESSION_FALLBACK = ['estrada', 'mais', 'dev', 'session', 'key', '2026'].join('-')

interface DriverSessionData {
  driverId?: number
}

interface SessionRuntimeConfig {
  appSecret: string
  appUrl: string
}

function isVitestRuntime(): boolean {
  return '__vitest_worker__' in globalThis
}

function resolveSessionRuntimeConfig(event?: H3Event): SessionRuntimeConfig {
  try {
    const config = event ? useRuntimeConfig(event) : useRuntimeConfig()
    const rawSecret = typeof config.appSecret === 'string' ? config.appSecret.trim() : ''
    const rawAppUrl =
      typeof config.public?.appUrl === 'string' && config.public.appUrl.trim().length > 0
        ? config.public.appUrl.trim()
        : 'http://localhost:3000'

    return {
      appSecret: rawSecret,
      appUrl: rawAppUrl,
    }
  } catch {
    return {
      appSecret: '',
      appUrl: 'http://localhost:3000',
    }
  }
}

function resolveSessionSecret(configuredSecret: string): string {
  if (configuredSecret.length >= MIN_SESSION_SECRET_LENGTH) {
    return configuredSecret
  }

  // Fallback determinístico restrito a dev/test para não expor chave fixa em produção nem falhar sem .env local.
  if (import.meta.dev || isVitestRuntime()) {
    return DEV_TEST_SESSION_FALLBACK
  }

  throw new DomainError('SERVICE_UNAVAILABLE', 'Configuração de segredo de sessão ausente.')
}

function resolveForwardedProto(event: H3Event): string | null {
  const forwardedProto = getHeader(event, 'x-forwarded-proto')
  if (typeof forwardedProto !== 'string') {
    return null
  }
  return forwardedProto.split(',')[0]?.trim().toLowerCase() ?? null
}

function isLocalhostHost(host: string): boolean {
  return host.startsWith('localhost') || host.startsWith('127.0.0.1')
}

function isHttpsRequest(event: H3Event, appUrl: string): boolean {
  const proto = resolveForwardedProto(event)
  if (proto === 'https' || proto === 'http') {
    return proto === 'https'
  }

  if (isLocalhostHost(getHeader(event, 'host') ?? '')) {
    return false
  }

  const socket = event.node?.req.socket as { encrypted?: boolean } | undefined
  return socket?.encrypted === true || appUrl.toLowerCase().startsWith('https://')
}

function buildSessionCookieOptions(
  event: H3Event,
  appUrl: string,
): NonNullable<Exclude<SessionConfig['cookie'], false>> {
  return {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
    secure: isHttpsRequest(event, appUrl),
  }
}

function buildSessionConfig(event: H3Event): SessionConfig {
  const { appSecret, appUrl } = resolveSessionRuntimeConfig(event)
  return {
    name: SESSION_COOKIE_NAME,
    password: resolveSessionSecret(appSecret),
    maxAge: SESSION_MAX_AGE_SECONDS,
    sessionHeader: false,
    cookie: buildSessionCookieOptions(event, appUrl),
  }
}

/**
 * Obtém o driverId autenticado da sessão selada quando presente, ou null se não houver sessão válida.
 */
export async function getSessionDriverId(event: H3Event): Promise<number | null> {
  // Evita inicializar e emitir cookie vazio em rotas públicas anônimas (ex.: /api/health).
  const hasCookie = Boolean(getCookie(event, SESSION_COOKIE_NAME))
  if (!hasCookie) {
    return null
  }

  const session = await useSession<DriverSessionData>(event, buildSessionConfig(event))
  const driverId = session.data.driverId
  if (typeof driverId === 'number' && Number.isInteger(driverId) && driverId > 0) {
    return driverId
  }

  return null
}

/**
 * Exige sessão autenticada válida na requisição atual ou lança DomainError UNAUTHORIZED.
 */
export async function requireAuthenticatedDriverId(event: H3Event): Promise<number> {
  const driverId = await getSessionDriverId(event)
  if (driverId === null) {
    throw new DomainError('UNAUTHORIZED', 'Sessão expirada ou não autenticada.')
  }

  return driverId
}

/**
 * Grava o identificador do motorista autenticado na sessão selada em cookie httpOnly.
 */
export async function setDriverSession(event: H3Event, driverId: number): Promise<void> {
  const session = await useSession<DriverSessionData>(event, buildSessionConfig(event))
  await session.update({ driverId })
}

/**
 * Encerra a sessão removendo o cookie nuxt-session com Max-Age=0.
 */
export async function clearDriverSession(event: H3Event): Promise<void> {
  const { appUrl } = resolveSessionRuntimeConfig(event)
  await clearSession(event, {
    name: SESSION_COOKIE_NAME,
    cookie: {
      ...buildSessionCookieOptions(event, appUrl),
      maxAge: 0,
    },
  })
}
