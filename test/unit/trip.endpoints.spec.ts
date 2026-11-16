import { IncomingMessage, ServerResponse } from 'node:http'
import { Socket } from 'node:net'
import { eq } from 'drizzle-orm'
import { createEvent, isError } from 'h3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getDatabase, resetDatabaseSingletonForTests } from '../../server/database/client'
import { runMigrations } from '../../server/database/migrate'
import { expenses } from '../../server/database/schema'
import { createTestDriver, seedDatabase } from '../../server/database/seed'
import { SESSION_COOKIE_NAME, setDriverSession } from '../../server/utils/session'

const VALID_TEST_SECRET = ['teste', 'trips', 'sessao', 'estrada', 'mais', '2026'].join('-')

function createHttpEvent(options: {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  url: string
  body?: Record<string, unknown>
  headers?: Record<string, string>
  params?: Record<string, string>
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
  const event = createEvent(req, res)
  if (options.params) {
    event.context.params = options.params
  }
  return { event, res }
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

describe('Handlers HTTP de Viagens (/api/trips/*)', () => {
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

  it('deve exigir autenticação e executar CRUD completo com validações 400/401/404/200/201', async () => {
    const singletonDb = getDatabase()
    runMigrations(singletonDb)
    await seedDatabase(singletonDb)
    const otherDriver = await createTestDriver(singletonDb)

    const { default: listHandler } = await import('../../server/api/trips/index.get')
    const { default: createHandler } = await import('../../server/api/trips/index.post')
    const { default: updateHandler } = await import('../../server/api/trips/[id].put')
    const { default: deleteHandler } = await import('../../server/api/trips/[id].delete')

    const unauthGet = createHttpEvent({ method: 'GET', url: '/api/trips' })
    expect(await listHandler(unauthGet.event).catch(extractHttpStatus)).toBe(401)

    const unauthPost = createHttpEvent({ method: 'POST', url: '/api/trips', body: {} })
    expect(await createHandler(unauthPost.event).catch(extractHttpStatus)).toBe(401)

    const sessionCall = createHttpEvent({
      method: 'GET',
      url: '/api/trips',
      headers: { host: 'localhost:3000' },
    })
    await setDriverSession(sessionCall.event, 1)
    const cookie = extractCookiePair(sessionCall.res)

    // GET filtrado por mês
    const getSep = createHttpEvent({
      method: 'GET',
      url: '/api/trips?month=2026-09&period=month&state=TODOS',
      headers: { cookie },
    })
    const sepRes = await listHandler(getSep.event)
    expect(sepRes.meta.totalCount).toBe(5)
    expect(sepRes.meta.summary.weightedAverageKmL).toBeCloseTo(2.42, 2)

    // GET com query inválida
    const badQuery = createHttpEvent({
      method: 'GET',
      url: '/api/trips?state=XX',
      headers: { cookie },
    })
    expect(await listHandler(badQuery.event).catch(extractHttpStatus)).toBe(400)

    // POST inválido (kmEnd <= kmStart)
    const invalidOdometer = createHttpEvent({
      method: 'POST',
      url: '/api/trips',
      headers: { cookie },
      body: {
        tripDate: '2026-09-17',
        origin: 'Santos, SP',
        destination: 'Rondonópolis, MT',
        freightValueReais: 15000,
        tollCostReais: 300,
        kmStart: 786060,
        kmEnd: 784320,
        fuelLiters: 500,
        fuelCostReais: 2400,
      },
    })
    expect(await createHandler(invalidOdometer.event).catch(extractHttpStatus)).toBe(400)

    // POST válido -> 201 Created + despesas vinculadas
    const validCreate = createHttpEvent({
      method: 'POST',
      url: '/api/trips',
      headers: { cookie },
      body: {
        tripDate: '2026-09-17',
        invoiceNumber: '99881',
        origin: 'Santos, SP',
        destination: 'Curitiba, PR',
        freightValueReais: 8500,
        cargoWeightTons: 30.5,
        tollCostReais: 180,
        kmStart: 786060,
        kmEnd: 786500,
        fuelLiters: 180,
        fuelCostReais: 864,
      },
    })
    const createdRes = await createHandler(validCreate.event)
    expect(validCreate.res.statusCode).toBe(201)
    expect(createdRes.data.distanceKm).toBe(440)
    const createdId = createdRes.data.id

    // PUT inválido (ID não numérico -> 400)
    const badIdPut = createHttpEvent({
      method: 'PUT',
      url: '/api/trips/abc',
      headers: { cookie },
      params: { id: 'abc' },
      body: {},
    })
    expect(await updateHandler(badIdPut.event).catch(extractHttpStatus)).toBe(400)

    // PUT válido -> 200 OK e sincroniza despesas
    const validPut = createHttpEvent({
      method: 'PUT',
      url: `/api/trips/${createdId}`,
      headers: { cookie },
      params: { id: String(createdId) },
      body: {
        tripDate: '2026-09-18',
        invoiceNumber: '99882',
        origin: 'Santos, SP',
        destination: 'Joinville, SC',
        freightValueReais: 9200,
        cargoWeightTons: 31,
        tollCostReais: 0,
        kmStart: 786060,
        kmEnd: 786560,
        fuelLiters: 200,
        fuelCostReais: 960,
      },
    })
    const updatedRes = await updateHandler(validPut.event)
    expect(updatedRes.data.destination).toBe('Joinville, SC')
    expect(
      singletonDb.select().from(expenses).where(eq(expenses.tripId, createdId)).all(),
    ).toHaveLength(1)

    // Sessão de outro motorista não pode editar nem excluir (404)
    const otherSessionCall = createHttpEvent({
      method: 'GET',
      url: '/api/trips',
      headers: { host: 'localhost:3000' },
    })
    await setDriverSession(otherSessionCall.event, otherDriver.id)
    const otherCookie = extractCookiePair(otherSessionCall.res)

    const otherPut = createHttpEvent({
      method: 'PUT',
      url: `/api/trips/${createdId}`,
      headers: { cookie: otherCookie },
      params: { id: String(createdId) },
      body: {
        tripDate: '2026-09-18',
        origin: 'Santos, SP',
        destination: 'Joinville, SC',
        freightValueReais: 9200,
        tollCostReais: 0,
        kmStart: 786060,
        kmEnd: 786560,
        fuelLiters: 200,
        fuelCostReais: 960,
      },
    })
    expect(await updateHandler(otherPut.event).catch(extractHttpStatus)).toBe(404)

    const otherDelete = createHttpEvent({
      method: 'DELETE',
      url: `/api/trips/${createdId}`,
      headers: { cookie: otherCookie },
      params: { id: String(createdId) },
    })
    expect(await deleteHandler(otherDelete.event).catch(extractHttpStatus)).toBe(404)

    // DELETE válido pelo dono -> 200 OK e cascata nas despesas
    const validDelete = createHttpEvent({
      method: 'DELETE',
      url: `/api/trips/${createdId}`,
      headers: { cookie },
      params: { id: String(createdId) },
    })
    const deleteRes = await deleteHandler(validDelete.event)
    expect(deleteRes).toEqual({ success: true })
    expect(
      singletonDb.select().from(expenses).where(eq(expenses.tripId, createdId)).all(),
    ).toHaveLength(0)
  })
})
