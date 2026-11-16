import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createDatabaseClient,
  getDatabase,
  resetDatabaseSingletonForTests,
  type AppDatabase,
} from '../../server/database/client'
import { runMigrations } from '../../server/database/migrate'
import { createTestDriver, createTestExpense, createTestTrip } from '../../server/database/seed'
import { HealthRepository } from '../../server/repositories/health.repository'

describe('HealthRepository (SQLite :memory:)', () => {
  let db: AppDatabase
  let repository: HealthRepository

  beforeEach(() => {
    db = createDatabaseClient(':memory:')
    runMigrations(db)
    repository = new HealthRepository(db)
  })

  afterEach(() => {
    resetDatabaseSingletonForTests()
    vi.unstubAllGlobals()
    if (db.$client.open) {
      db.$client.close()
    }
  })

  it('deve retornar true em pingDatabase quando o SQLite está conectado', () => {
    const alive = repository.pingDatabase()

    expect(alive).toBe(true)
  })

  it('deve retornar false em pingDatabase quando a conexão SQLite foi encerrada', () => {
    db.$client.close()

    const alive = repository.pingDatabase()

    expect(alive).toBe(false)
  })

  it('deve contar viagens e despesas por motorista e filtrar opcionalmente pela competência', async () => {
    const driver = await createTestDriver(db)
    const otherDriver = await createTestDriver(db)

    createTestTrip(db, driver.id, { tripDate: '2026-09-10' })
    createTestTrip(db, driver.id, { tripDate: '2026-09-15' })
    createTestTrip(db, driver.id, { tripDate: '2026-08-20' })
    createTestTrip(db, otherDriver.id, { tripDate: '2026-09-12' })

    createTestExpense(db, driver.id, { expenseDate: '2026-09-16' })
    createTestExpense(db, driver.id, { expenseDate: '2026-08-18' })
    createTestExpense(db, otherDriver.id, { expenseDate: '2026-09-16' })

    const septemberCounts = repository.getNavigationCounts(driver.id, '2026-09')
    const allCounts = repository.getNavigationCounts(driver.id)

    expect(septemberCounts).toEqual({ tripsCount: 2, expensesCount: 1 })
    expect(allCounts).toEqual({ tripsCount: 3, expensesCount: 2 })
  })

  it('deve utilizar o singleton getDatabase quando nenhuma instância for injetada no construtor', async () => {
    vi.stubGlobal('useRuntimeConfig', () => ({ databaseUrl: ':memory:' }))
    const singletonDb = getDatabase()
    runMigrations(singletonDb)
    const driver = await createTestDriver(singletonDb)
    createTestTrip(singletonDb, driver.id, { tripDate: '2026-09-10' })

    const defaultRepository = new HealthRepository()

    expect(defaultRepository.pingDatabase()).toBe(true)
    expect(defaultRepository.getNavigationCounts(driver.id, '2026-09')).toEqual({
      tripsCount: 1,
      expensesCount: 0,
    })
  })
})
