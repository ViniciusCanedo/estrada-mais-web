import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createDatabaseClient,
  resetDatabaseSingletonForTests,
  type AppDatabase,
} from '../../server/database/client'
import { runMigrations } from '../../server/database/migrate'
import { expenses } from '../../server/database/schema'
import { createTestDriver, seedDatabase } from '../../server/database/seed'
import { TripRepository } from '../../server/repositories/trip.repository'
import {
  INVALID_FUEL_LITERS_MESSAGE,
  INVALID_LOCATION_MESSAGE,
  INVALID_ODOMETER_MESSAGE,
  TRIP_NOT_FOUND_MESSAGE,
  TripService,
} from '../../server/services/trip.service'
import { DomainError } from '../../server/utils/domain-error'
import { tripFilterQuerySchema } from '../../shared/schemas/trip.schema'

describe('TripService (server/services/trip.service)', () => {
  let db: AppDatabase
  let repository: TripRepository
  let service: TripService

  beforeEach(() => {
    db = createDatabaseClient(':memory:')
    runMigrations(db)
    repository = new TripRepository(db)
    service = new TripService({
      tripRepo: repository,
      nowProvider: () => new Date('2026-09-17T12:00:00.000Z'),
    })
  })

  afterEach(() => {
    resetDatabaseSingletonForTests()
    vi.unstubAllGlobals()
    if (db.$client.open) {
      db.$client.close()
    }
  })

  it('deve listar viagens por mês, últimos 90 dias e ano completo com média ponderada real', async () => {
    await seedDatabase(db)

    const sepList = service.listTrips(
      1,
      tripFilterQuerySchema.parse({ month: '2026-09', period: 'month' }),
    )
    expect(sepList.meta.totalCount).toBe(5)
    expect(sepList.meta.summary.totalDistanceKm).toBe(3755)
    expect(sepList.meta.summary.weightedAverageKmL).toBeCloseTo(2.42, 2)
    expect(sepList.meta.summary.totalFuelCostReais).toBe(7453)
    expect(sepList.meta.summary.totalTollCostReais).toBe(982)
    expect(sepList.meta.summary.totalFreightValueReais).toBe(44300)

    const allTrips = service.listTrips(1, tripFilterQuerySchema.parse({ period: 'month' }))
    expect(allTrips.meta.totalCount).toBe(10)

    const last90 = service.listTrips(
      1,
      tripFilterQuerySchema.parse({ month: '2026-09', period: 'last90days' }),
    )
    expect(last90.meta.totalCount).toBe(7)

    const last90WithoutMonth = service.listTrips(
      1,
      tripFilterQuerySchema.parse({ period: 'last90days' }),
    )
    expect(last90WithoutMonth.meta.totalCount).toBe(7)

    const fullYear = service.listTrips(1, tripFilterQuerySchema.parse({ period: 'year' }))
    expect(fullYear.meta.totalCount).toBe(10)

    const fullYearWithMonth = service.listTrips(
      1,
      tripFilterQuerySchema.parse({ month: '2026-09', period: 'year' }),
    )
    expect(fullYearWithMonth.meta.totalCount).toBe(10)

    const filteredMt = service.listTrips(
      1,
      tripFilterQuerySchema.parse({ month: '2026-09', state: 'mt' }),
    )
    expect(filteredMt.meta.totalCount).toBe(1)
    expect(filteredMt.meta.availableStates).toContain('SP')
    expect(filteredMt.meta.availableStates).toContain('MT')
  })

  it('deve criar viagem com despesas vinculadas, atualizar sem duplicatas e excluir em cascata', async () => {
    const driver = await createTestDriver(db)

    const created = service.createTrip(driver.id, {
      tripDate: '2026-09-17',
      invoiceNumber: '10825',
      origin: 'Santos, SP',
      destination: 'Rondonópolis, MT',
      freightValueReais: 18500,
      cargoWeightTons: 32.4,
      tollCostReais: 412,
      kmStart: 784320,
      kmEnd: 786060,
      fuelLiters: 722,
      fuelCostReais: 3465,
    })

    expect(created.distanceKm).toBe(1740)
    expect(created.kmPerLiter).toBeCloseTo(2.41, 2)
    expect(created.cargoWeightTons).toBeCloseTo(32.4, 2)

    const createdExpenses = db.select().from(expenses).where(eq(expenses.tripId, created.id)).all()
    expect(createdExpenses).toHaveLength(2)
    expect(createdExpenses.find((item) => item.category === 'combustivel')?.receiptReference).toBe(
      'NF-e 10825',
    )

    // Atualiza zerando pedágio, removendo NF-e e carga opcional.
    const updated = service.updateTrip(driver.id, created.id, {
      tripDate: '2026-09-18',
      invoiceNumber: '',
      origin: 'Campinas, SP',
      destination: 'Goiânia, GO',
      freightValueReais: 9000,
      tollCostReais: 0,
      kmStart: 786060,
      kmEnd: 787060,
      fuelLiters: 400,
      fuelCostReais: 2000,
    })

    expect(updated.distanceKm).toBe(1000)
    expect(updated.invoiceNumber).toBeNull()
    expect(updated.cargoWeightTons).toBeNull()

    const updatedExpenses = db.select().from(expenses).where(eq(expenses.tripId, created.id)).all()
    expect(updatedExpenses).toHaveLength(1)
    expect(updatedExpenses[0]?.receiptReference).toBe('Viagem')
    expect(updatedExpenses[0]?.amountCents).toBe(200000)

    // Cria viagem sem custos vinculados (ambos 0).
    const zeroCostTrip = service.createTrip(driver.id, {
      tripDate: '2026-09-19',
      origin: 'Curitiba, PR',
      destination: 'Joinville, SC',
      freightValueReais: 0,
      tollCostReais: 0,
      kmStart: 100,
      kmEnd: 230,
      fuelLiters: 50,
      fuelCostReais: 0,
    })
    expect(
      db.select().from(expenses).where(eq(expenses.tripId, zeroCostTrip.id)).all(),
    ).toHaveLength(0)

    service.deleteTrip(driver.id, created.id)
    expect(db.select().from(expenses).where(eq(expenses.tripId, created.id)).all()).toHaveLength(0)
  })

  it('deve lançar DomainError em validações defensivas e viagens inexistentes ou de outro motorista', async () => {
    const driver = await createTestDriver(db)
    const otherDriver = await createTestDriver(db)

    expect(() =>
      service.createTrip(driver.id, {
        tripDate: '2026-09-17',
        origin: 'Santos, SP',
        destination: 'Rondonópolis, MT',
        freightValueReais: 1000,
        tollCostReais: 0,
        kmStart: 1000,
        kmEnd: 1000,
        fuelLiters: 100,
        fuelCostReais: 500,
      }),
    ).toThrowError(new DomainError('VALIDATION_ERROR', INVALID_ODOMETER_MESSAGE))

    expect(() =>
      service.createTrip(driver.id, {
        tripDate: '2026-09-17',
        origin: 'Santos',
        destination: 'Rondonópolis, MT',
        freightValueReais: 1000,
        tollCostReais: 0,
        kmStart: 1000,
        kmEnd: 1200,
        fuelLiters: 100,
        fuelCostReais: 500,
      }),
    ).toThrowError(new DomainError('VALIDATION_ERROR', INVALID_LOCATION_MESSAGE))

    expect(() =>
      service.createTrip(driver.id, {
        tripDate: '2026-09-17',
        origin: 'Santos, SP',
        destination: 'Rondonópolis',
        freightValueReais: 1000,
        tollCostReais: 0,
        kmStart: 1000,
        kmEnd: 1200,
        fuelLiters: 100,
        fuelCostReais: 500,
      }),
    ).toThrowError(new DomainError('VALIDATION_ERROR', INVALID_LOCATION_MESSAGE))

    expect(() =>
      service.createTrip(driver.id, {
        tripDate: '2026-09-17',
        origin: 'Santos, SP',
        destination: 'Rondonópolis, MT',
        freightValueReais: 1000,
        tollCostReais: 0,
        kmStart: 1000,
        kmEnd: 1200,
        fuelLiters: 0.01,
        fuelCostReais: 500,
      }),
    ).toThrowError(new DomainError('VALIDATION_ERROR', INVALID_FUEL_LITERS_MESSAGE))

    const created = service.createTrip(driver.id, {
      tripDate: '2026-09-17',
      origin: 'Santos, SP',
      destination: 'Rondonópolis, MT',
      freightValueReais: 1000,
      tollCostReais: 100,
      kmStart: 1000,
      kmEnd: 1500,
      fuelLiters: 200,
      fuelCostReais: 900,
    })

    expect(() =>
      service.updateTrip(otherDriver.id, created.id, {
        tripDate: '2026-09-17',
        origin: 'Santos, SP',
        destination: 'Rondonópolis, MT',
        freightValueReais: 1000,
        tollCostReais: 100,
        kmStart: 1000,
        kmEnd: 1500,
        fuelLiters: 200,
        fuelCostReais: 900,
      }),
    ).toThrowError(new DomainError('NOT_FOUND', TRIP_NOT_FOUND_MESSAGE))

    expect(() => service.deleteTrip(otherDriver.id, created.id)).toThrowError(
      new DomainError('NOT_FOUND', TRIP_NOT_FOUND_MESSAGE),
    )

    // Cobre branch defensivo quando updateWithLinkedExpenses retorna undefined após findByIdAndDriver.
    const spyRepo = new TripRepository(db)
    vi.spyOn(spyRepo, 'updateWithLinkedExpenses').mockReturnValue(undefined)
    const fallbackService = new TripService({ tripRepo: spyRepo })
    expect(() =>
      fallbackService.updateTrip(driver.id, created.id, {
        tripDate: '2026-09-17',
        origin: 'Santos, SP',
        destination: 'Rondonópolis, MT',
        freightValueReais: 1000,
        tollCostReais: 100,
        kmStart: 1000,
        kmEnd: 1500,
        fuelLiters: 200,
        fuelCostReais: 900,
      }),
    ).toThrowError(new DomainError('NOT_FOUND', TRIP_NOT_FOUND_MESSAGE))
  })
})
