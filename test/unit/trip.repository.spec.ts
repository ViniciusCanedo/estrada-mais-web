import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createDatabaseClient,
  getDatabase,
  resetDatabaseSingletonForTests,
  type AppDatabase,
} from '../../server/database/client'
import { runMigrations } from '../../server/database/migrate'
import { expenses, trips } from '../../server/database/schema'
import { createTestDriver, createTestTrip, seedDatabase } from '../../server/database/seed'
import { SEED_TIMESTAMP } from '../../server/database/seed-data'
import {
  TripRepository,
  type NewTripLinkedExpenseRow,
} from '../../server/repositories/trip.repository'

function buildSampleTripRow(driverId: number, overrides: Partial<typeof trips.$inferInsert> = {}) {
  return {
    driverId,
    tripDate: '2026-09-20',
    invoiceNumber: '20901',
    originCity: 'Santos',
    originState: 'SP',
    destinationCity: 'Rondonópolis',
    destinationState: 'MT',
    cargoWeightKg: 32000,
    freightValueCents: 1800000,
    tollCostCents: 40000,
    kmStart: 800000,
    kmEnd: 801700,
    distanceKm: 1700,
    fuelLitersDeciliters: 7000,
    fuelCostCents: 340000,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
    ...overrides,
  }
}

function buildLinkedExpenses(
  driverId: number,
  fuelCents: number,
  tollCents: number,
): NewTripLinkedExpenseRow[] {
  const list: NewTripLinkedExpenseRow[] = []
  if (fuelCents > 0) {
    list.push({
      driverId,
      expenseDate: '2026-09-20',
      category: 'combustivel',
      description: 'Abastecimento Percurso: Santos, SP → Rondonópolis, MT',
      amountCents: fuelCents,
      fuelLitersDeciliters: 7000,
      paymentMethod: 'cartao_frota',
      receiptReference: 'NF-e 20901',
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    })
  }
  if (tollCents > 0) {
    list.push({
      driverId,
      expenseDate: '2026-09-20',
      category: 'pedagio',
      description: 'Pedágios Percurso: Santos, SP → Rondonópolis, MT',
      amountCents: tollCents,
      fuelLitersDeciliters: null,
      paymentMethod: 'cartao_frota',
      receiptReference: 'Via TAG / Percurso',
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    })
  }
  return list
}

describe('TripRepository (SQLite :memory:)', () => {
  let db: AppDatabase
  let repository: TripRepository

  beforeEach(() => {
    db = createDatabaseClient(':memory:')
    runMigrations(db)
    repository = new TripRepository(db)
  })

  afterEach(() => {
    resetDatabaseSingletonForTests()
    vi.unstubAllGlobals()
    if (db.$client.open) {
      db.$client.close()
    }
  })

  it('deve criar viagem e despesas vinculadas atomicamente e fazer rollback em falha de constraint', async () => {
    const driver = await createTestDriver(db)

    const created = repository.createWithLinkedExpenses(
      buildSampleTripRow(driver.id),
      buildLinkedExpenses(driver.id, 340000, 40000),
    )
    expect(created.id).toBeGreaterThan(0)

    const linkedRows = db.select().from(expenses).where(eq(expenses.tripId, created.id)).all()
    expect(linkedRows).toHaveLength(2)
    expect(linkedRows.map((row) => row.category).sort()).toEqual(['combustivel', 'pedagio'])

    const createdWithoutExpenses = repository.createWithLinkedExpenses(
      buildSampleTripRow(driver.id, { fuelCostCents: 0, tollCostCents: 0 }),
      [],
    )
    expect(
      db.select().from(expenses).where(eq(expenses.tripId, createdWithoutExpenses.id)).all(),
    ).toHaveLength(0)

    expect(() =>
      repository.createWithLinkedExpenses(buildSampleTripRow(driver.id), [
        {
          driverId: driver.id,
          expenseDate: '2026-09-20',
          category: 'combustivel',
          description: 'Falha constraint',
          amountCents: 0,
          fuelLitersDeciliters: 100,
          paymentMethod: 'cartao_frota',
          receiptReference: 'NF-e',
          createdAt: SEED_TIMESTAMP,
          updatedAt: SEED_TIMESTAMP,
        },
      ]),
    ).toThrow()

    const totalTrips = db.select().from(trips).where(eq(trips.driverId, driver.id)).all()
    expect(totalTrips).toHaveLength(2)
  })

  it('deve sincronizar despesas na edição sem duplicatas e aplicar ON DELETE CASCADE ao excluir', async () => {
    const driver = await createTestDriver(db)
    const otherDriver = await createTestDriver(db)

    const created = repository.createWithLinkedExpenses(
      buildSampleTripRow(driver.id),
      buildLinkedExpenses(driver.id, 340000, 40000),
    )

    const initialExpenses = db.select().from(expenses).where(eq(expenses.tripId, created.id)).all()
    const initialFuelExpenseId = initialExpenses.find((row) => row.category === 'combustivel')?.id

    // Edita mantendo combustível e removendo pedágio.
    const updatedNoToll = repository.updateWithLinkedExpenses(
      created.id,
      driver.id,
      { tollCostCents: 0, fuelCostCents: 360000 },
      buildLinkedExpenses(driver.id, 360000, 0),
    )
    expect(updatedNoToll?.fuelCostCents).toBe(360000)

    const afterRemoveToll = db.select().from(expenses).where(eq(expenses.tripId, created.id)).all()
    expect(afterRemoveToll).toHaveLength(1)
    expect(afterRemoveToll[0]?.id).toBe(initialFuelExpenseId)
    expect(afterRemoveToll[0]?.amountCents).toBe(360000)

    // Edita reinserindo pedágio.
    repository.updateWithLinkedExpenses(
      created.id,
      driver.id,
      { tollCostCents: 25000 },
      buildLinkedExpenses(driver.id, 360000, 25000),
    )
    const afterRestoreToll = db.select().from(expenses).where(eq(expenses.tripId, created.id)).all()
    expect(afterRestoreToll).toHaveLength(2)

    // Não altera viagem de outro motorista.
    expect(
      repository.updateWithLinkedExpenses(created.id, otherDriver.id, { tollCostCents: 100 }, []),
    ).toBeUndefined()
    expect(repository.findByIdAndDriver(created.id, otherDriver.id)).toBeUndefined()
    expect(repository.deleteByIdAndDriver(created.id, otherDriver.id)).toBe(false)

    // Exclusão remove viagem e despesas vinculadas por ON DELETE CASCADE.
    expect(repository.deleteByIdAndDriver(created.id, driver.id)).toBe(true)
    expect(repository.findByIdAndDriver(created.id, driver.id)).toBeUndefined()
    expect(db.select().from(expenses).where(eq(expenses.tripId, created.id)).all()).toHaveLength(0)
  })

  it('deve filtrar por período, UF (origem ou destino), busca textual normalizada e ordenar com segurança', async () => {
    await seedDatabase(db)
    const otherDriver = await createTestDriver(db)
    createTestTrip(db, otherDriver.id, { originState: 'AM', destinationState: 'PA' })

    expect(repository.listDistinctStates(1)).toEqual([
      'GO',
      'MG',
      'MS',
      'MT',
      'PR',
      'RJ',
      'RS',
      'SC',
      'SP',
    ])

    const sepTrips = repository.findManyByFilter(1, {
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      state: 'TODOS',
      sortBy: 'tripDate',
      sortDir: 'desc',
    })
    expect(sepTrips).toHaveLength(5)

    const mtTrips = repository.findManyByFilter(1, {
      state: 'MT',
      sortBy: 'tripDate',
      sortDir: 'desc',
    })
    expect(mtTrips).toHaveLength(1)
    expect(mtTrips[0]?.destinationCity).toBe('Rondonópolis')

    const accentSearch = repository.findManyByFilter(1, {
      search: 'rondonopolis',
      state: 'TODOS',
      sortBy: 'tripDate',
      sortDir: 'desc',
    })
    expect(accentSearch).toHaveLength(1)

    const invoiceSearch = repository.findManyByFilter(1, {
      search: '#10819',
      state: 'TODOS',
      sortBy: 'tripDate',
      sortDir: 'desc',
    })
    expect(invoiceSearch).toHaveLength(1)
    expect(invoiceSearch[0]?.originCity).toBe('Cascavel')

    // Busca com '#' isolado e viagem sem NF-e não deve falhar nem retornar falso positivo.
    createTestTrip(db, 1, {
      tripDate: '2026-08-01',
      invoiceNumber: null,
      originCity: 'Bauru',
      originState: 'SP',
    })
    const hashOnlySearch = repository.findManyByFilter(1, {
      search: '#',
      state: 'TODOS',
      sortBy: 'tripDate',
      sortDir: 'desc',
    })
    expect(hashOnlySearch).toHaveLength(0)

    const blankSearch = repository.findManyByFilter(1, {
      search: '   ',
      state: 'TODOS',
      sortBy: 'distanceKm',
      sortDir: 'asc',
    })
    expect(blankSearch).toHaveLength(11)
    expect(blankSearch[0]?.distanceKm).toBe(180)

    const sortedByEfficiency = repository.findManyByFilter(1, {
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      state: 'TODOS',
      sortBy: 'kmPerLiter',
      sortDir: 'desc',
    })
    expect(sortedByEfficiency[0]?.invoiceNumber).toBe('10819')

    const sortedByCost = repository.findManyByFilter(1, {
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      state: 'TODOS',
      sortBy: 'costPerKm',
      sortDir: 'asc',
    })
    expect(sortedByCost[0]?.invoiceNumber).toBe('10775')

    const sortedByRoute = repository.findManyByFilter(1, {
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      state: 'TODOS',
      sortBy: 'route',
      sortDir: 'asc',
    })
    expect(sortedByRoute[0]?.originCity).toBe('Betim')
  })

  it('deve utilizar singleton getDatabase quando nenhum banco é injetado no construtor', async () => {
    vi.stubGlobal('useRuntimeConfig', () => ({ databaseUrl: ':memory:' }))
    const singletonDb = getDatabase()
    runMigrations(singletonDb)
    const driver = await createTestDriver(singletonDb)
    createTestTrip(singletonDb, driver.id)

    const defaultRepo = new TripRepository()
    expect(defaultRepo.listDistinctStates(driver.id)).toEqual(['MT', 'SP'])
  })
})
