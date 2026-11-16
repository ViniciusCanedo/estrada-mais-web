import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createDatabaseClient,
  getDatabase,
  resetDatabaseSingletonForTests,
  type AppDatabase,
} from '../../server/database/client'
import { runMigrations } from '../../server/database/migrate'
import { createTestDriver, createTestExpense, createTestTrip } from '../../server/database/seed'
import { ExpenseRepository } from '../../server/repositories/expense.repository'

describe('ExpenseRepository (SQLite :memory:)', () => {
  let db: AppDatabase
  let repository: ExpenseRepository

  beforeEach(() => {
    db = createDatabaseClient(':memory:')
    runMigrations(db)
    repository = new ExpenseRepository(db)
  })

  afterEach(() => {
    resetDatabaseSingletonForTests()
    vi.unstubAllGlobals()
    if (db.$client.open) {
      db.$client.close()
    }
  })

  it('deve listar despesas por motorista, mês e categoria ordenadas por data e id decrescentes', async () => {
    const driver = await createTestDriver(db)
    const otherDriver = await createTestDriver(db)

    const olderFuel = createTestExpense(db, driver.id, {
      expenseDate: '2026-09-10',
      category: 'combustivel',
      description: 'Posto Alpha',
    })
    const sameDayFirst = createTestExpense(db, driver.id, {
      expenseDate: '2026-09-16',
      category: 'borracharia',
      description: 'Borracharia Primeiro',
      fuelLitersDeciliters: null,
    })
    const sameDaySecond = createTestExpense(db, driver.id, {
      expenseDate: '2026-09-16',
      category: 'combustivel',
      description: 'Posto Segundo',
    })
    createTestExpense(db, driver.id, {
      expenseDate: '2026-08-25',
      category: 'manutencao',
      description: 'Oficina Agosto',
      fuelLitersDeciliters: null,
    })
    createTestExpense(db, otherDriver.id, {
      expenseDate: '2026-09-16',
      category: 'combustivel',
      description: 'Outro Motorista',
    })

    const septemberAll = repository.findManyByDriverAndMonth(driver.id, '2026-09')
    expect(septemberAll.map((item) => item.id)).toEqual([
      sameDaySecond.id,
      sameDayFirst.id,
      olderFuel.id,
    ])

    const septemberFuel = repository.findManyByDriverAndMonth(driver.id, '2026-09', 'combustivel')
    expect(septemberFuel.map((item) => item.id)).toEqual([sameDaySecond.id, olderFuel.id])

    const allMonths = repository.findManyByDriverAndMonth(driver.id)
    expect(allMonths).toHaveLength(4)
  })

  it('deve contar despesas por categoria no mês independentemente de filtros e isolar por motorista', async () => {
    const driver = await createTestDriver(db)
    const otherDriver = await createTestDriver(db)

    createTestExpense(db, driver.id, { expenseDate: '2026-09-16', category: 'combustivel' })
    createTestExpense(db, driver.id, { expenseDate: '2026-09-15', category: 'combustivel' })
    createTestExpense(db, driver.id, {
      expenseDate: '2026-09-14',
      category: 'pedagio',
      fuelLitersDeciliters: null,
    })
    createTestExpense(db, driver.id, {
      expenseDate: '2026-09-12',
      category: 'manutencao',
      fuelLitersDeciliters: null,
    })
    createTestExpense(db, driver.id, {
      expenseDate: '2026-08-20',
      category: 'alimentacao',
      fuelLitersDeciliters: null,
    })
    createTestExpense(db, otherDriver.id, {
      expenseDate: '2026-09-16',
      category: 'outros',
      fuelLitersDeciliters: null,
    })

    expect(repository.countByCategoryInMonth(driver.id, '2026-09')).toEqual({
      todas: 4,
      combustivel: 2,
      pedagio: 1,
      borracharia: 0,
      manutencao: 1,
      alimentacao: 0,
      outros: 0,
    })

    expect(repository.countByCategoryInMonth(driver.id)).toEqual({
      todas: 5,
      combustivel: 2,
      pedagio: 1,
      borracharia: 0,
      manutencao: 1,
      alimentacao: 1,
      outros: 0,
    })
  })

  it('deve criar, buscar por dono, atualizar e excluir despesas preservando isolamento entre motoristas', async () => {
    const driver = await createTestDriver(db)
    const otherDriver = await createTestDriver(db)
    const trip = createTestTrip(db, driver.id)

    const created = repository.create({
      driverId: driver.id,
      tripId: trip.id,
      expenseDate: '2026-09-17',
      category: 'pedagio',
      description: 'Pedágio Via Dutra',
      amountCents: 14500,
      fuelLitersDeciliters: null,
      paymentMethod: 'cartao_frota',
      receiptReference: 'Extrato',
      createdAt: '2026-09-17T10:00:00.000Z',
      updatedAt: '2026-09-17T10:00:00.000Z',
    })

    expect(repository.findByIdAndDriver(created.id, driver.id)?.tripId).toBe(trip.id)
    expect(repository.findByIdAndDriver(created.id, otherDriver.id)).toBeUndefined()

    const updated = repository.update(created.id, driver.id, {
      amountCents: 19900,
      description: 'Pedágio Via Dutra Atualizado',
      updatedAt: '2026-09-17T11:00:00.000Z',
    })
    expect(updated?.amountCents).toBe(19900)
    expect(updated?.description).toBe('Pedágio Via Dutra Atualizado')
    expect(repository.update(created.id, otherDriver.id, { amountCents: 50000 })).toBeUndefined()

    expect(repository.deleteByIdAndDriver(created.id, otherDriver.id)).toBe(false)
    expect(repository.deleteByIdAndDriver(created.id, driver.id)).toBe(true)
    expect(repository.findByIdAndDriver(created.id, driver.id)).toBeUndefined()
    expect(repository.deleteByIdAndDriver(created.id, driver.id)).toBe(false)
  })

  it('deve utilizar o singleton getDatabase quando nenhuma instância é injetada', async () => {
    vi.stubGlobal('useRuntimeConfig', () => ({ databaseUrl: ':memory:' }))
    const singletonDb = getDatabase()
    runMigrations(singletonDb)
    const driver = await createTestDriver(singletonDb)
    createTestExpense(singletonDb, driver.id, { expenseDate: '2026-09-16' })

    const defaultRepo = new ExpenseRepository()
    expect(defaultRepo.findManyByDriverAndMonth(driver.id, '2026-09')).toHaveLength(1)
  })
})
