import { randomBytes } from 'node:crypto'
import { eq, max } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { seed } from 'drizzle-seed'
import { PAYMENT_METHODS } from '../../shared/types/domain'
import { hashPassword, hashTokenSha256 } from '../utils/password'
import { runCliDatabaseAction, type AppDatabase } from './client'
import {
  drivers,
  expenses,
  passwordResetTokens,
  trips,
  type DriverRow,
  type ExpenseRow,
  type NewDriverRow,
  type NewExpenseRow,
  type NewPasswordResetTokenRow,
  type NewTripRow,
  type PasswordResetTokenRow,
  type TripRow,
} from './schema'
import {
  DEFAULT_DRIVER_EMAIL,
  DEFAULT_DRIVER_PROFILE,
  DEFAULT_DRIVER_SECRET,
  HISTORICAL_EXPENSE_DATES,
  HISTORICAL_EXPENSE_DESCRIPTIONS,
  SEED_STANDALONE_EXPENSES_DATA,
  SEED_TIMESTAMP,
  SEED_TRIPS_DATA,
  type SeedTripInput,
} from './seed-data'

function buildLinkedTripExpenses(driverId: number, trip: TripRow): NewExpenseRow[] {
  const routeLabel = `${trip.originCity}, ${trip.originState} → ${trip.destinationCity}, ${trip.destinationState}`
  const items: NewExpenseRow[] = []

  if (trip.fuelCostCents > 0) {
    items.push({
      driverId,
      tripId: trip.id,
      expenseDate: trip.tripDate,
      category: 'combustivel',
      description: `Abastecimento Percurso: ${routeLabel}`,
      amountCents: trip.fuelCostCents,
      fuelLitersDeciliters: trip.fuelLitersDeciliters,
      paymentMethod: 'cartao_frota',
      receiptReference: trip.invoiceNumber ? `NF-e ${trip.invoiceNumber}` : 'Viagem',
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    })
  }

  if (trip.tollCostCents > 0) {
    items.push({
      driverId,
      tripId: trip.id,
      expenseDate: trip.tripDate,
      category: 'pedagio',
      description: `Pedágios Percurso: ${routeLabel}`,
      amountCents: trip.tollCostCents,
      fuelLitersDeciliters: null,
      paymentMethod: 'cartao_frota',
      receiptReference: 'Via TAG / Percurso',
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    })
  }

  return items
}

async function seedHistoricalExpenses(database: AppDatabase, driverId: number): Promise<void> {
  const maxRow = database
    .select({ maxId: max(expenses.id) })
    .from(expenses)
    .get()
  const baseId = maxRow?.maxId ?? 0
  const generatedIds = Array.from({ length: 10 }, (_, index) => baseId + index + 1)

  await seed(drizzle(database.$client), { expenses }, { count: 10, seed: 202609 }).refine(
    (funcs) => ({
      expenses: {
        columns: {
          id: funcs.valuesFromArray({ values: generatedIds, isUnique: true }),
          driverId: funcs.default({ defaultValue: driverId }),
          tripId: funcs.default({ defaultValue: null }),
          expenseDate: funcs.valuesFromArray({ values: HISTORICAL_EXPENSE_DATES }),
          category: funcs.valuesFromArray({
            values: ['borracharia', 'manutencao', 'alimentacao', 'outros'],
          }),
          description: funcs.valuesFromArray({ values: HISTORICAL_EXPENSE_DESCRIPTIONS }),
          amountCents: funcs.int({ minValue: 8500, maxValue: 92000 }),
          fuelLitersDeciliters: funcs.default({ defaultValue: null }),
          paymentMethod: funcs.valuesFromArray({ values: [...PAYMENT_METHODS] }),
          receiptReference: funcs.valuesFromArray({
            values: ['Recibo', 'Cupom', 'NF-e 7102', 'Extrato'],
          }),
          createdAt: funcs.default({ defaultValue: SEED_TIMESTAMP }),
          updatedAt: funcs.default({ defaultValue: SEED_TIMESTAMP }),
        },
      },
    }),
  )
}

function insertSeedTripWithExpenses(
  database: AppDatabase,
  driverId: number,
  tripData: SeedTripInput,
): void {
  const insertedTrip = database
    .insert(trips)
    .values({
      ...tripData,
      driverId,
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    })
    .returning()
    .get()

  const linkedExpenses = buildLinkedTripExpenses(driverId, insertedTrip)
  if (linkedExpenses.length > 0) {
    database.insert(expenses).values(linkedExpenses).run()
  }
}

/**
 * Popula o banco de forma idempotente com o motorista padrão Valdir Silveira e dados de Abr–Set/2026.
 */
export async function seedDatabase(database: AppDatabase): Promise<void> {
  const existing = database
    .select({ id: drivers.id })
    .from(drivers)
    .where(eq(drivers.email, DEFAULT_DRIVER_EMAIL))
    .get()

  if (existing) {
    return
  }

  const passwordHash = await hashPassword(DEFAULT_DRIVER_SECRET)
  const driver = database
    .insert(drivers)
    .values({
      ...DEFAULT_DRIVER_PROFILE,
      passwordHash,
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    })
    .returning()
    .get()

  await seedHistoricalExpenses(database, driver.id)

  for (const tripItem of SEED_TRIPS_DATA) {
    insertSeedTripWithExpenses(database, driver.id, tripItem)
  }

  database
    .insert(expenses)
    .values(
      SEED_STANDALONE_EXPENSES_DATA.map((item) => ({
        ...item,
        driverId: driver.id,
        tripId: null,
        createdAt: SEED_TIMESTAMP,
        updatedAt: SEED_TIMESTAMP,
      })),
    )
    .run()
}

/**
 * Factory determinística de motorista para uso em testes automatizados.
 */
export async function createTestDriver(
  database: AppDatabase,
  overrides: Partial<NewDriverRow> = {},
): Promise<DriverRow> {
  const uniqueSuffix = randomBytes(6).toString('hex')
  const passwordHash = overrides.passwordHash ?? (await hashPassword(DEFAULT_DRIVER_SECRET))

  return database
    .insert(drivers)
    .values({
      name: DEFAULT_DRIVER_PROFILE.name,
      email: `motorista-${uniqueSuffix}@estrada.com.br`,
      rntrc: DEFAULT_DRIVER_PROFILE.rntrc,
      vehicleModel: DEFAULT_DRIVER_PROFILE.vehicleModel,
      vehiclePlates: DEFAULT_DRIVER_PROFILE.vehiclePlates,
      targetConsumptionMilliKml: DEFAULT_DRIVER_PROFILE.targetConsumptionMilliKml,
      maxCostPerKmCents: DEFAULT_DRIVER_PROFILE.maxCostPerKmCents,
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
      ...overrides,
      passwordHash,
    })
    .returning()
    .get()
}

/**
 * Factory determinística de token de recuperação de senha para testes automatizados.
 */
export function createTestResetToken(
  database: AppDatabase,
  driverId: number,
  overrides: Partial<NewPasswordResetTokenRow> = {},
): PasswordResetTokenRow {
  const defaultHash = hashTokenSha256(`token-${driverId}-${randomBytes(8).toString('hex')}`)
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()

  return database
    .insert(passwordResetTokens)
    .values({
      driverId,
      tokenHash: defaultHash,
      expiresAt,
      usedAt: null,
      createdAt: SEED_TIMESTAMP,
      ...overrides,
    })
    .returning()
    .get()
}

/**
 * Factory determinística de viagem rodoviária para testes automatizados.
 */
export function createTestTrip(
  database: AppDatabase,
  driverId: number,
  overrides: Partial<NewTripRow> = {},
): TripRow {
  const kmStart = overrides.kmStart ?? 784320
  const kmEnd = overrides.kmEnd ?? kmStart + 1000
  const distanceKm = overrides.distanceKm ?? kmEnd - kmStart

  return database
    .insert(trips)
    .values({
      driverId,
      tripDate: '2026-09-15',
      invoiceNumber: '10824',
      originCity: 'Santos',
      originState: 'SP',
      destinationCity: 'Rondonópolis',
      destinationState: 'MT',
      cargoWeightKg: 32400,
      freightValueCents: 1850000,
      tollCostCents: 41200,
      kmStart,
      kmEnd,
      distanceKm,
      fuelLitersDeciliters: 4000,
      fuelCostCents: 192000,
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
      ...overrides,
    })
    .returning()
    .get()
}

/**
 * Factory determinística de despesa operacional para testes automatizados.
 */
export function createTestExpense(
  database: AppDatabase,
  driverId: number,
  overrides: Partial<NewExpenseRow> = {},
): ExpenseRow {
  return database
    .insert(expenses)
    .values({
      driverId,
      tripId: null,
      expenseDate: '2026-09-16',
      category: 'combustivel',
      description: 'Posto Graal Rodovia dos Bandeirantes KM 56',
      amountCents: 240000,
      fuelLitersDeciliters: 5000,
      paymentMethod: 'cartao_frota',
      receiptReference: 'NF-e 8912',
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
      ...overrides,
    })
    .returning()
    .get()
}

const cliDbPath = process.env.NUXT_DATABASE_URL || './.data/sqlite/estrada.db'
void runCliDatabaseAction(import.meta.url, cliDbPath, async (cliDb) => {
  await seedDatabase(cliDb)
  process.stdout.write(`Seed SQLite executado com sucesso em: ${cliDbPath}\n`)
})
