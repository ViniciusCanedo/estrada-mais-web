import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { eq } from 'drizzle-orm'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createDatabaseClient,
  getDatabase,
  resetDatabaseSingletonForTests,
  runCliDatabaseAction,
} from '../../server/database/client'
import { runMigrations } from '../../server/database/migrate'
import { drivers, expenses, passwordResetTokens, trips } from '../../server/database/schema'
import {
  createTestDriver,
  createTestExpense,
  createTestResetToken,
  createTestTrip,
  seedDatabase,
} from '../../server/database/seed'
import { DEFAULT_DRIVER_EMAIL } from '../../server/database/seed-data'

describe('Camada de Banco SQLite, Migrations e Seed (server/database)', () => {
  const tempDirs: string[] = []

  afterEach(() => {
    resetDatabaseSingletonForTests()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()

    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('deve configurar foreign_keys e busy_timeout em instância :memory:', () => {
    const db = createDatabaseClient(':memory:')

    const fkPragma = db.$client.pragma('foreign_keys', { simple: true })
    const busyTimeout = db.$client.pragma('busy_timeout', { simple: true })

    expect(fkPragma).toBe(1)
    expect(busyTimeout).toBe(5000)
    db.$client.close()
  })

  it('deve criar diretórios ausentes e ativar modo WAL e synchronous NORMAL para arquivo SQLite', () => {
    const baseDir = mkdtempSync(join(tmpdir(), 'estrada-db-'))
    tempDirs.push(baseDir)
    const dbPath = join(baseDir, 'nested', 'sqlite', 'estrada.db')

    const db = createDatabaseClient(dbPath)
    const journalMode = String(db.$client.pragma('journal_mode', { simple: true })).toLowerCase()
    const synchronous = db.$client.pragma('synchronous', { simple: true })

    expect(existsSync(dbPath)).toBe(true)
    expect(journalMode).toBe('wal')
    expect(synchronous).toBe(1)
    db.$client.close()
  })

  it('deve gerenciar singleton em getDatabase usando runtimeConfig e fallback seguro', () => {
    vi.stubGlobal('useRuntimeConfig', () => ({ databaseUrl: ':memory:' }))

    const first = getDatabase()
    const second = getDatabase()

    expect(first).toBe(second)

    resetDatabaseSingletonForTests()
    const baseDir = mkdtempSync(join(tmpdir(), 'estrada-singleton-'))
    tempDirs.push(baseDir)
    const customPath = join(baseDir, 'singleton.db')
    vi.stubGlobal('useRuntimeConfig', () => ({ databaseUrl: customPath }))

    const third = getDatabase()
    expect(third).not.toBe(first)
    expect(existsSync(customPath)).toBe(true)
  })

  it('deve aplicar migrations criando tabelas, constraints CHECK e ON DELETE CASCADE', async () => {
    const db = createDatabaseClient(':memory:')
    runMigrations(db)

    const driver = await createTestDriver(db)
    const trip = createTestTrip(db, driver.id)
    createTestExpense(db, driver.id, { tripId: trip.id })
    createTestResetToken(db, driver.id)

    expect(() =>
      db
        .insert(trips)
        .values({
          driverId: driver.id,
          tripDate: '2026-09-15',
          originCity: 'Santos',
          originState: 'SP',
          destinationCity: 'Curitiba',
          destinationState: 'PR',
          kmStart: 500,
          kmEnd: 400,
          distanceKm: 100,
          fuelLitersDeciliters: 100,
          createdAt: '2026-09-15T00:00:00.000Z',
          updatedAt: '2026-09-15T00:00:00.000Z',
        })
        .run(),
    ).toThrow()

    expect(() =>
      db
        .insert(expenses)
        .values({
          driverId: driver.id,
          expenseDate: '2026-09-15',
          category: 'outros',
          description: 'Valor zerado inválido',
          amountCents: 0,
          paymentMethod: 'pix',
          createdAt: '2026-09-15T00:00:00.000Z',
          updatedAt: '2026-09-15T00:00:00.000Z',
        })
        .run(),
    ).toThrow()

    db.delete(trips).where(eq(trips.id, trip.id)).run()
    expect(db.select().from(expenses).where(eq(expenses.tripId, trip.id)).all()).toHaveLength(0)

    db.delete(drivers).where(eq(drivers.id, driver.id)).run()
    expect(db.select().from(passwordResetTokens).all()).toHaveLength(0)
    db.$client.close()
  })

  it('deve executar seedDatabase de forma idempotente populando Valdir Silveira e histórico Abr–Set/2026', async () => {
    const db = createDatabaseClient(':memory:')
    runMigrations(db)

    await seedDatabase(db)
    const firstDriversCount = db.select().from(drivers).all().length
    const firstTripsCount = db.select().from(trips).all().length
    const firstExpensesCount = db.select().from(expenses).all().length

    await seedDatabase(db)
    const secondDriversCount = db.select().from(drivers).all().length
    const secondTripsCount = db.select().from(trips).all().length
    const secondExpensesCount = db.select().from(expenses).all().length

    const valdir = db.select().from(drivers).where(eq(drivers.email, DEFAULT_DRIVER_EMAIL)).get()
    expect(valdir?.name).toBe('Valdir Silveira')
    expect(firstDriversCount).toBe(1)
    expect(firstTripsCount).toBe(10)
    expect(firstExpensesCount).toBe(35)
    expect(secondDriversCount).toBe(firstDriversCount)
    expect(secondTripsCount).toBe(firstTripsCount)
    expect(secondExpensesCount).toBe(firstExpensesCount)

    db.$client.close()
  })

  it('deve aplicar migrations no boot via plugin Nitro e registrar erro crítico em falha', async () => {
    vi.stubGlobal('defineNitroPlugin', <T>(plugin: T): T => plugin)
    vi.stubGlobal('useRuntimeConfig', () => ({ databaseUrl: ':memory:' }))

    const { default: migratePlugin } = await import('../../server/plugins/01.database-migrate')
    expect(() => (migratePlugin as () => void)()).not.toThrow()

    const seededRows = getDatabase().select().from(drivers).all()
    expect(seededRows).toEqual([])

    resetDatabaseSingletonForTests()
    vi.stubGlobal('useRuntimeConfig', () => ({ databaseUrl: '/dev/null/nao-existe/estrada.db' }))
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockReturnValue(true)

    expect(() => (migratePlugin as () => void)()).toThrow()
    expect(stderrSpy).toHaveBeenCalledTimes(1)
  })

  it('deve executar ação CLI em runCliDatabaseAction somente quando entrypoint corresponde ao script', async () => {
    const skippedAction = vi.fn()
    await runCliDatabaseAction('file:///outro-script.ts', ':memory:', skippedAction)
    expect(skippedAction).not.toHaveBeenCalled()

    const currentEntryUrl = pathToFileURL(resolve(process.argv[1] ?? '')).href
    const executedAction = vi.fn()
    await runCliDatabaseAction(currentEntryUrl, ':memory:', executedAction)
    expect(executedAction).toHaveBeenCalledTimes(1)
  })
})
