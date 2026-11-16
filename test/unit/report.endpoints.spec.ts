import { IncomingMessage, ServerResponse } from 'node:http'
import { Socket } from 'node:net'
import { createEvent, isError } from 'h3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getDatabase, resetDatabaseSingletonForTests } from '../../server/database/client'
import { runMigrations } from '../../server/database/migrate'
import { createTestDriver, createTestExpense, createTestTrip } from '../../server/database/seed'
import { SESSION_COOKIE_NAME, setDriverSession } from '../../server/utils/session'

const VALID_TEST_SECRET = ['teste', 'reports', 'sessao', 'estrada', 'mais', '2026'].join('-')

function createHttpEvent(options: { url: string; headers?: Record<string, string> }) {
  const socket = new Socket()
  const req = new IncomingMessage(socket)
  req.method = 'GET'
  req.url = options.url
  req.headers = { ...options.headers }
  req.push(null)
  const res = new ServerResponse(req)
  const event = createEvent(req, res)
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

describe('Handlers HTTP de Relatórios (/api/reports/*)', () => {
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

  it('deve exigir autenticação, validar query month e retornar dashboard JSON e CSV UTF-8 BOM', async () => {
    const singletonDb = getDatabase()
    runMigrations(singletonDb)
    const driver = await createTestDriver(singletonDb, {
      name: 'Valdir Relatório',
      email: 'relatorio@estrada.com.br',
    })
    createTestTrip(singletonDb, driver.id, {
      tripDate: '2026-09-15',
      distanceKm: 1000,
      fuelLitersDeciliters: 4000,
      freightValueCents: 1000000,
    })
    createTestExpense(singletonDb, driver.id, {
      expenseDate: '2026-09-16',
      category: 'combustivel',
      description: '=SUM(1,1) Posto Seguro',
      amountCents: 240000,
      fuelLitersDeciliters: 5000,
    })

    const { default: dashboardHandler } = await import('../../server/api/reports/dashboard.get')
    const { default: csvHandler } = await import('../../server/api/reports/csv.get')

    const unauthDash = createHttpEvent({ url: '/api/reports/dashboard' })
    expect(await dashboardHandler(unauthDash.event).catch(extractHttpStatus)).toBe(401)
    const unauthCsv = createHttpEvent({ url: '/api/reports/csv' })
    expect(await csvHandler(unauthCsv.event).catch(extractHttpStatus)).toBe(401)

    const sessionCall = createHttpEvent({
      url: '/api/reports/dashboard',
      headers: { host: 'localhost:3000' },
    })
    await setDriverSession(sessionCall.event, driver.id)
    const cookie = extractCookiePair(sessionCall.res)

    const invalidDash = createHttpEvent({
      url: '/api/reports/dashboard?month=2026-13',
      headers: { cookie },
    })
    expect(await dashboardHandler(invalidDash.event).catch(extractHttpStatus)).toBe(400)

    const invalidCsv = createHttpEvent({
      url: '/api/reports/csv?month=invalido',
      headers: { cookie },
    })
    expect(await csvHandler(invalidCsv.event).catch(extractHttpStatus)).toBe(400)

    const validDash = createHttpEvent({
      url: '/api/reports/dashboard?month=2026-09',
      headers: { cookie },
    })
    const dashboardRes = await dashboardHandler(validDash.event)
    expect(dashboardRes.data.month).toBe('2026-09')
    expect(dashboardRes.data.stats.kmDriven.totalKm).toBe(1000)
    expect(dashboardRes.data.hero.costPerKmReais).toBeCloseTo(2.4, 6)
    expect(dashboardRes.data.recentTrips).toHaveLength(1)
    expect(dashboardRes.data.recentExpenses).toHaveLength(1)

    const validCsv = createHttpEvent({
      url: '/api/reports/csv?month=2026-09',
      headers: { cookie },
    })
    const csvContent = await csvHandler(validCsv.event)
    expect(validCsv.res.getHeader('content-type')).toBe('text/csv; charset=utf-8')
    expect(validCsv.res.getHeader('content-disposition')).toBe(
      'attachment; filename="estrada-mais-relatorio-2026-09.csv"',
    )
    expect(csvContent.startsWith('\uFEFF')).toBe(true)
    expect(csvContent).toContain("'=SUM(1,1) Posto Seguro")

    const missingDriverSession = createHttpEvent({
      url: '/api/reports/dashboard',
      headers: { host: 'localhost:3000' },
    })
    await setDriverSession(missingDriverSession.event, 99999)
    const missingCookie = extractCookiePair(missingDriverSession.res)
    const missingDash = createHttpEvent({
      url: '/api/reports/dashboard',
      headers: { cookie: missingCookie },
    })
    expect(await dashboardHandler(missingDash.event).catch(extractHttpStatus)).toBe(404)
  })
})
