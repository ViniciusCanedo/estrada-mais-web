import { IncomingMessage, ServerResponse } from 'node:http'
import { Socket } from 'node:net'
import { createEvent, isError } from 'h3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getDatabase, resetDatabaseSingletonForTests } from '../../server/database/client'
import { runMigrations } from '../../server/database/migrate'
import { createTestDriver, seedDatabase } from '../../server/database/seed'
import { SESSION_COOKIE_NAME, setDriverSession } from '../../server/utils/session'

const VALID_TEST_SECRET = ['teste', 'expenses', 'sessao', 'estrada', 'mais', '2026'].join('-')

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

describe('Handlers HTTP de Despesas (/api/expenses/*)', () => {
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

  it('deve exigir autenticação e executar GET/POST/PUT/DELETE em /api/expenses/* com validação Zod', async () => {
    const singletonDb = getDatabase()
    runMigrations(singletonDb)
    await seedDatabase(singletonDb)
    const otherDriver = await createTestDriver(singletonDb, {
      email: 'outro.expense@estrada.com.br',
    })

    const { default: listHandler } = await import('../../server/api/expenses/index.get')
    const { default: createHandler } = await import('../../server/api/expenses/index.post')
    const { default: updateHandler } = await import('../../server/api/expenses/[id].put')
    const { default: deleteHandler } = await import('../../server/api/expenses/[id].delete')

    const unauthGet = createHttpEvent({ method: 'GET', url: '/api/expenses' })
    expect(await listHandler(unauthGet.event).catch(extractHttpStatus)).toBe(401)
    const unauthPost = createHttpEvent({ method: 'POST', url: '/api/expenses', body: {} })
    expect(await createHandler(unauthPost.event).catch(extractHttpStatus)).toBe(401)

    const sessionSeedCall = createHttpEvent({
      method: 'GET',
      url: '/api/expenses',
      headers: { host: 'localhost:3000' },
    })
    await setDriverSession(sessionSeedCall.event, otherDriver.id)
    const cookie = extractCookiePair(sessionSeedCall.res)

    const invalidQuery = createHttpEvent({
      method: 'GET',
      url: '/api/expenses?month=invalido',
      headers: { cookie },
    })
    expect(await listHandler(invalidQuery.event).catch(extractHttpStatus)).toBe(400)

    const invalidFuelPost = createHttpEvent({
      method: 'POST',
      url: '/api/expenses',
      headers: { cookie },
      body: {
        category: 'combustivel',
        expenseDate: '2026-09-17',
        description: 'Posto Sem Litros',
        amountReais: 1000,
        paymentMethod: 'cartao_frota',
      },
    })
    expect(await createHandler(invalidFuelPost.event).catch(extractHttpStatus)).toBe(400)

    const createFuelCall = createHttpEvent({
      method: 'POST',
      url: '/api/expenses',
      headers: { cookie },
      body: {
        category: 'combustivel',
        expenseDate: '2026-09-17',
        description: 'Posto Graal KM 120',
        fuelLiters: 500,
        amountReais: 2400,
        paymentMethod: 'cartao_frota',
        receiptReference: 'NF-e 99241',
      },
    })
    const created = await createHandler(createFuelCall.event)
    expect(createFuelCall.res.statusCode).toBe(201)
    expect(created.data.pricePerLiterReais).toBeCloseTo(4.8, 6)
    expect(created.data.receiptBadgeType).toBe('fiscal')

    const createMaintCall = createHttpEvent({
      method: 'POST',
      url: '/api/expenses',
      headers: { cookie },
      body: {
        category: 'manutencao',
        expenseDate: '2026-09-15',
        description: 'Oficina Diesel Express',
        fuelLiters: 90,
        amountReais: 650,
        paymentMethod: 'pix',
        receiptReference: 'Recibo',
      },
    })
    const createdMaint = await createHandler(createMaintCall.event)
    expect(createdMaint.data.fuelLiters).toBeNull()
    expect(createdMaint.data.receiptBadgeType).toBe('simple')

    const filteredGet = createHttpEvent({
      method: 'GET',
      url: '/api/expenses?month=2026-09&category=combustivel',
      headers: { cookie },
    })
    const listed = await listHandler(filteredGet.event)
    expect(listed.data).toHaveLength(1)
    expect(listed.meta.countsByCategory.todas).toBe(2)
    expect(listed.meta.countsByCategory.combustivel).toBe(1)
    expect(listed.meta.countsByCategory.manutencao).toBe(1)

    const invalidIdPut = createHttpEvent({
      method: 'PUT',
      url: '/api/expenses/abc',
      headers: { cookie },
      params: { id: 'abc' },
      body: {},
    })
    expect(await updateHandler(invalidIdPut.event).catch(extractHttpStatus)).toBe(400)

    const foreignPut = createHttpEvent({
      method: 'PUT',
      url: '/api/expenses/1',
      headers: { cookie },
      params: { id: '1' },
      body: {
        category: 'outros',
        expenseDate: '2026-09-16',
        description: 'Despesa de outro motorista',
        amountReais: 100,
        paymentMethod: 'dinheiro',
      },
    })
    expect(await updateHandler(foreignPut.event).catch(extractHttpStatus)).toBe(404)

    const validPut = createHttpEvent({
      method: 'PUT',
      url: `/api/expenses/${created.data.id}`,
      headers: { cookie },
      params: { id: String(created.data.id) },
      body: {
        category: 'pedagio',
        expenseDate: '2026-09-17',
        description: 'Recarga Sem Parar',
        amountReais: 550,
        paymentMethod: 'boleto',
        receiptReference: 'Extrato 09',
      },
    })
    const updated = await updateHandler(validPut.event)
    expect(updated.data.category).toBe('pedagio')
    expect(updated.data.fuelLiters).toBeNull()
    expect(updated.data.receiptBadgeType).toBe('fiscal')

    const validDelete = createHttpEvent({
      method: 'DELETE',
      url: `/api/expenses/${created.data.id}`,
      headers: { cookie },
      params: { id: String(created.data.id) },
    })
    expect(await deleteHandler(validDelete.event)).toEqual({ success: true })

    const missingDelete = createHttpEvent({
      method: 'DELETE',
      url: `/api/expenses/${created.data.id}`,
      headers: { cookie },
      params: { id: String(created.data.id) },
    })
    expect(await deleteHandler(missingDelete.event).catch(extractHttpStatus)).toBe(404)
  })
})
