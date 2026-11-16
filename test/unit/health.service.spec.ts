import { IncomingMessage, ServerResponse } from 'node:http'
import { Socket } from 'node:net'
import { createEvent, isError } from 'h3'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createDatabaseClient,
  getDatabase,
  resetDatabaseSingletonForTests,
} from '../../server/database/client'
import { runMigrations } from '../../server/database/migrate'
import { createTestDriver, createTestExpense, createTestTrip } from '../../server/database/seed'
import {
  HealthRepository,
  type IHealthRepository,
} from '../../server/repositories/health.repository'
import { HealthService } from '../../server/services/health.service'
import { DomainError } from '../../server/utils/domain-error'
import { competenceMonthSchema, competenceQuerySchema } from '../../shared/schemas/common.schema'
import { healthResponseSchema } from '../../shared/schemas/health.schema'

function createMockGetEvent(url: string) {
  const socket = new Socket()
  const req = new IncomingMessage(socket)
  req.url = url
  req.method = 'GET'
  const res = new ServerResponse(req)
  return createEvent(req, res)
}

describe('HealthService, Schemas e Endpoint /api/health', () => {
  afterEach(() => {
    resetDatabaseSingletonForTests()
    vi.unstubAllGlobals()
  })

  it('deve validar competência mensal AAAA-MM em common.schema e rejeitar formatos inválidos', () => {
    expect(competenceMonthSchema.parse('2026-09')).toBe('2026-09')
    expect(competenceQuerySchema.parse({})).toEqual({})
    expect(competenceQuerySchema.parse({ month: '2026-01' })).toEqual({ month: '2026-01' })

    expect(() => competenceMonthSchema.parse('2026-13')).toThrow()
    expect(() => competenceMonthSchema.parse('2026-00')).toThrow()
    expect(() => competenceMonthSchema.parse('26-09')).toThrow()
  })

  it('deve retornar payload ok conectado quando o repositório confirma conectividade', () => {
    const db = createDatabaseClient(':memory:')
    runMigrations(db)
    const service = new HealthService(new HealthRepository(db))

    const payload = service.getHealthStatus()

    expect(healthResponseSchema.parse(payload)).toEqual(payload)
    expect(payload.status).toBe('ok')
    expect(payload.database).toBe('connected')
    expect(payload.navigationCounts).toBeUndefined()
    db.$client.close()
  })

  it('deve incluir navigationCounts quando driverId autenticado é informado', async () => {
    const db = createDatabaseClient(':memory:')
    runMigrations(db)
    const driver = await createTestDriver(db)
    createTestTrip(db, driver.id, { tripDate: '2026-09-11' })
    createTestExpense(db, driver.id, { expenseDate: '2026-09-12' })

    const service = new HealthService(new HealthRepository(db))
    const payload = service.getHealthStatus(driver.id, '2026-09')

    expect(payload.status).toBe('ok')
    expect(payload.navigationCounts).toEqual({ tripsCount: 1, expensesCount: 1 })
    db.$client.close()
  })

  it('deve lançar DomainError SERVICE_UNAVAILABLE quando o SQLite estiver indisponível', () => {
    const failingRepo: IHealthRepository = {
      pingDatabase: () => false,
      getNavigationCounts: () => ({ tripsCount: 0, expensesCount: 0 }),
    }
    const service = new HealthService(failingRepo)

    expect(() => service.getHealthStatus()).toThrowError(DomainError)
    try {
      service.getHealthStatus()
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(DomainError)
      expect((error as DomainError).code).toBe('SERVICE_UNAVAILABLE')
      expect((error as DomainError).statusCode).toBe(503)
    }
  })

  it('deve validar query e responder via handler GET /api/health', async () => {
    vi.stubGlobal('useRuntimeConfig', () => ({ databaseUrl: ':memory:' }))
    runMigrations(getDatabase())

    const { default: healthHandler } = await import('../../server/api/health.get')
    const validEvent = createMockGetEvent('/api/health?month=2026-09')
    const result = await healthHandler(validEvent)

    expect(result.status).toBe('ok')
    expect(result.database).toBe('connected')

    const invalidEvent = createMockGetEvent('/api/health?month=invalido')
    let caughtError: unknown
    try {
      await healthHandler(invalidEvent)
    } catch (error: unknown) {
      caughtError = error
    }

    expect(isError(caughtError)).toBe(true)
    expect((caughtError as { statusCode: number }).statusCode).toBe(400)
  })
})
