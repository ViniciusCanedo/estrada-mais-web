import { IncomingMessage, ServerResponse } from 'node:http'
import { Socket } from 'node:net'
import { createEvent, isError } from 'h3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getDatabase, resetDatabaseSingletonForTests } from '../../server/database/client'
import { runMigrations } from '../../server/database/migrate'
import { createTestDriver, seedDatabase } from '../../server/database/seed'
import { DEFAULT_DRIVER_EMAIL, DEFAULT_DRIVER_SECRET } from '../../server/database/seed-data'
import { SESSION_COOKIE_NAME, setDriverSession } from '../../server/utils/session'

const VALID_TEST_SECRET = ['teste', 'settings', 'sessao', 'estrada', 'mais', '2026'].join('-')
const HANDLER_NEW_CREDENTIAL = ['NovaSenhaEndpoint', '2026'].join('@')

function createHttpEvent(options: {
  method: 'GET' | 'PUT'
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

function extractCookiePair(res: ServerResponse): string {
  const header = res.getHeader('set-cookie')
  let items: string[] = []
  if (Array.isArray(header)) {
    items = header
  } else if (typeof header === 'string') {
    items = [header]
  }
  const match = items.find((item) => item.startsWith(`${SESSION_COOKIE_NAME}=`))
  return match?.split(';')[0] ?? ''
}

function extractHttpStatus(caught: unknown): number {
  return isError(caught) ? caught.statusCode : 0
}

describe('Handlers HTTP de Configurações (/api/settings/*)', () => {
  beforeEach(() => {
    vi.stubGlobal('useRuntimeConfig', () => ({
      appSecret: VALID_TEST_SECRET,
      databaseUrl: ':memory:',
      smtp: { host: '', port: 587, user: '', pass: '', from: '' },
      public: { appUrl: 'http://localhost:3000' },
    }))
  })

  afterEach(() => {
    resetDatabaseSingletonForTests()
    vi.unstubAllGlobals()
  })

  it('deve exigir autenticação e executar GET/PUT em /api/settings/* com validação Zod', async () => {
    const singletonDb = getDatabase()
    runMigrations(singletonDb)
    await seedDatabase(singletonDb)
    const otherDriver = await createTestDriver(singletonDb, {
      email: 'outro.handler@estrada.com.br',
    })

    const { default: getHandler } = await import('../../server/api/settings/index.get')
    const { default: profileHandler } = await import('../../server/api/settings/profile.put')
    const { default: credentialsHandler } =
      await import('../../server/api/settings/credentials.put')
    const { default: targetsHandler } = await import('../../server/api/settings/targets.put')

    const unauthCall = createHttpEvent({ method: 'GET', url: '/api/settings' })
    expect(await getHandler(unauthCall.event).catch(extractHttpStatus)).toBe(401)

    const sessionSeedCall = createHttpEvent({
      method: 'GET',
      url: '/api/settings',
      headers: { host: 'localhost:3000' },
    })
    await setDriverSession(sessionSeedCall.event, 1)
    const cookie = extractCookiePair(sessionSeedCall.res)

    const getCall = createHttpEvent({
      method: 'GET',
      url: '/api/settings',
      headers: { cookie },
    })
    const loaded = await getHandler(getCall.event)
    expect(loaded.data.name).toBe('Valdir Silveira')

    const profileCall = createHttpEvent({
      method: 'PUT',
      url: '/api/settings/profile',
      headers: { cookie },
      body: {
        name: 'Valdir Atualizado',
        rntrc: '58.912.440-TAC',
        vehicleModel: 'Volvo FH540 6x4 (2024)',
        vehiclePlates: 'BRA-2E19 / CUR-4901',
      },
    })
    const profileRes = await profileHandler(profileCall.event)
    expect(profileRes.data.name).toBe('Valdir Atualizado')

    const conflictCredentialsCall = createHttpEvent({
      method: 'PUT',
      url: '/api/settings/credentials',
      headers: { cookie },
      body: {
        email: otherDriver.email,
      },
    })
    expect(await credentialsHandler(conflictCredentialsCall.event).catch(extractHttpStatus)).toBe(
      409,
    )

    const validCredentialsCall = createHttpEvent({
      method: 'PUT',
      url: '/api/settings/credentials',
      headers: { cookie },
      body: {
        email: DEFAULT_DRIVER_EMAIL,
        currentPassword: DEFAULT_DRIVER_SECRET,
        newPassword: HANDLER_NEW_CREDENTIAL,
      },
    })
    const credentialsRes = await credentialsHandler(validCredentialsCall.event)
    expect(credentialsRes.data.email).toBe(DEFAULT_DRIVER_EMAIL)

    const invalidTargetsCall = createHttpEvent({
      method: 'PUT',
      url: '/api/settings/targets',
      headers: { cookie },
      body: {
        targetConsumptionKmL: 4.5,
        maxCostPerKmReais: 5.1,
      },
    })
    expect(await targetsHandler(invalidTargetsCall.event).catch(extractHttpStatus)).toBe(400)

    const validTargetsCall = createHttpEvent({
      method: 'PUT',
      url: '/api/settings/targets',
      headers: { cookie },
      body: {
        targetConsumptionKmL: 2.55,
        maxCostPerKmReais: 5.4,
      },
    })
    const targetsRes = await targetsHandler(validTargetsCall.event)
    expect(targetsRes.data.targetConsumptionKmL).toBeCloseTo(2.55, 10)
    expect(targetsRes.data.maxCostPerKmReais).toBeCloseTo(5.4, 10)
  })
})
