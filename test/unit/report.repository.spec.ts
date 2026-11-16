import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createDatabaseClient,
  getDatabase,
  resetDatabaseSingletonForTests,
  type AppDatabase,
} from '../../server/database/client'
import { runMigrations } from '../../server/database/migrate'
import {
  createTestDriver,
  createTestExpense,
  createTestTrip,
  seedDatabase,
} from '../../server/database/seed'
import { ReportRepository } from '../../server/repositories/report.repository'

describe('ReportRepository (SQLite :memory:)', () => {
  let db: AppDatabase
  let repository: ReportRepository

  beforeEach(() => {
    db = createDatabaseClient(':memory:')
    runMigrations(db)
    repository = new ReportRepository(db)
  })

  afterEach(() => {
    resetDatabaseSingletonForTests()
    vi.unstubAllGlobals()
    if (db.$client.open) {
      db.$client.close()
    }
  })

  it('deve agregar viagens, categorias de despesas e últimas descrições no mês isolando por motorista', async () => {
    const driver = await createTestDriver(db)
    const otherDriver = await createTestDriver(db)

    createTestTrip(db, driver.id, {
      tripDate: '2026-09-10',
      distanceKm: 600,
      fuelLitersDeciliters: 2500,
      freightValueCents: 500000,
    })
    createTestTrip(db, driver.id, {
      tripDate: '2026-09-15',
      distanceKm: 400,
      fuelLitersDeciliters: 1500,
      freightValueCents: 350000,
    })
    createTestTrip(db, otherDriver.id, {
      tripDate: '2026-09-15',
      distanceKm: 9999,
      freightValueCents: 999900,
    })

    createTestExpense(db, driver.id, {
      expenseDate: '2026-09-05',
      category: 'borracharia',
      description: 'Borracharia Antiga',
      amountCents: 12000,
      fuelLitersDeciliters: null,
    })
    createTestExpense(db, driver.id, {
      expenseDate: '2026-09-14',
      category: 'borracharia',
      description: 'Borracharia Mais Recente',
      amountCents: 18000,
      fuelLitersDeciliters: null,
    })
    createTestExpense(db, driver.id, {
      expenseDate: '2026-09-12',
      category: 'manutencao',
      description: 'Troca de Óleo Scania',
      amountCents: 84000,
      fuelLitersDeciliters: null,
    })
    createTestExpense(db, driver.id, {
      expenseDate: '2026-09-16',
      category: 'combustivel',
      description: 'Posto Graal',
      amountCents: 240000,
      fuelLitersDeciliters: 5000,
    })
    createTestExpense(db, otherDriver.id, {
      expenseDate: '2026-09-16',
      category: 'combustivel',
      description: 'Outro Motorista',
      amountCents: 500000,
      fuelLitersDeciliters: 10000,
    })

    const sepAgg = repository.getMonthlyAggregates(driver.id, '2026-09')
    expect(sepAgg.totalDistanceKm).toBe(1000)
    expect(sepAgg.totalTripFuelDeciliters).toBe(4000)
    expect(sepAgg.totalGrossFreightCents).toBe(850000)
    expect(sepAgg.tripsCount).toBe(2)
    expect(sepAgg.expensesByCategoryCents.combustivel).toBe(240000)
    expect(sepAgg.expensesByCategoryCents.borracharia).toBe(30000)
    expect(sepAgg.expensesByCategoryCents.manutencao).toBe(84000)
    expect(sepAgg.expensesByCategoryCents.pedagio).toBe(0)
    expect(sepAgg.expensesCountByCategory.borracharia).toBe(2)
    expect(sepAgg.totalExpenseFuelDeciliters).toBe(5000)
    expect(sepAgg.lastTireShopDescription).toBe('Borracharia Mais Recente')
    expect(sepAgg.lastMaintenanceDescription).toBe('Troca de Óleo Scania')

    const emptyAgg = repository.getMonthlyAggregates(driver.id, '2026-01')
    expect(emptyAgg.totalDistanceKm).toBe(0)
    expect(emptyAgg.tripsCount).toBe(0)
    expect(emptyAgg.lastTireShopDescription).toBeNull()
    expect(emptyAgg.lastMaintenanceDescription).toBeNull()
  })

  it('deve consolidar série de seis meses e listar viagens e despesas ordenadas do mês', async () => {
    await seedDatabase(db)

    const months = ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09']
    const sixMonths = repository.getSixMonthsAggregates(1, months)
    expect(sixMonths).toHaveLength(6)
    expect(sixMonths.map((item) => item.month)).toEqual(months)
    expect(sixMonths[5]?.totalDistanceKm).toBe(3755)
    expect(sixMonths[5]?.tripsCount).toBe(5)

    const sepTrips = repository.listTripsForMonth(1, '2026-09')
    expect(sepTrips).toHaveLength(5)
    expect(sepTrips[0]?.tripDate).toBe('2026-09-15')

    const sepExpenses = repository.listExpensesForMonth(1, '2026-09')
    expect(sepExpenses).toHaveLength(15)
    expect(sepExpenses[0]?.expenseDate).toBe('2026-09-16')
  })

  it('deve utilizar singleton getDatabase quando nenhum banco é injetado', async () => {
    vi.stubGlobal('useRuntimeConfig', () => ({ databaseUrl: ':memory:' }))
    const singletonDb = getDatabase()
    runMigrations(singletonDb)
    const driver = await createTestDriver(singletonDb)
    createTestTrip(singletonDb, driver.id, { tripDate: '2026-09-15', distanceKm: 500 })

    const defaultRepo = new ReportRepository()
    expect(defaultRepo.getMonthlyAggregates(driver.id, '2026-09').totalDistanceKm).toBe(500)
  })
})
