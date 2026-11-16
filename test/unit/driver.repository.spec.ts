import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createDatabaseClient,
  getDatabase,
  resetDatabaseSingletonForTests,
  type AppDatabase,
} from '../../server/database/client'
import { runMigrations } from '../../server/database/migrate'
import { createTestDriver } from '../../server/database/seed'
import { DriverRepository } from '../../server/repositories/driver.repository'

describe('DriverRepository (SQLite :memory:)', () => {
  let db: AppDatabase
  let repository: DriverRepository

  beforeEach(() => {
    db = createDatabaseClient(':memory:')
    runMigrations(db)
    repository = new DriverRepository(db)
  })

  afterEach(() => {
    resetDatabaseSingletonForTests()
    vi.unstubAllGlobals()
    if (db.$client.open) {
      db.$client.close()
    }
  })

  it('deve buscar motorista por e-mail normalizado e por id', async () => {
    const created = await createTestDriver(db, {
      name: 'Valdir Silveira',
      email: 'valdir.repo@estrada.com.br',
    })

    const foundByEmail = repository.findByEmail('  VALDIR.REPO@ESTRADA.COM.BR ')
    const foundById = repository.findById(created.id)
    const missingByEmail = repository.findByEmail('inexistente@estrada.com.br')
    const missingById = repository.findById(999_999)

    expect(foundByEmail?.id).toBe(created.id)
    expect(foundById?.email).toBe('valdir.repo@estrada.com.br')
    expect(missingByEmail).toBeUndefined()
    expect(missingById).toBeUndefined()
  })

  it('deve atualizar passwordHash e updatedAt do motorista', async () => {
    const created = await createTestDriver(db)
    const nextTimestamp = '2026-09-17T08:30:00.000Z'

    repository.updatePasswordHash(created.id, 'scrypt$0011223344556677$aabbcc', nextTimestamp)

    const updated = repository.findById(created.id)
    expect(updated?.passwordHash).toBe('scrypt$0011223344556677$aabbcc')
    expect(updated?.updatedAt).toBe(nextTimestamp)
  })

  it('deve utilizar o singleton getDatabase quando nenhuma instância é injetada', async () => {
    vi.stubGlobal('useRuntimeConfig', () => ({ databaseUrl: ':memory:' }))
    const singletonDb = getDatabase()
    runMigrations(singletonDb)
    const driver = await createTestDriver(singletonDb, { email: 'singleton.repo@estrada.com.br' })

    const defaultRepo = new DriverRepository()
    expect(defaultRepo.findByEmail('singleton.repo@estrada.com.br')?.id).toBe(driver.id)
  })

  it('deve atualizar perfil cadastral, credenciais e metas de telemetria no SQLite', async () => {
    const initialHash = ['scrypt', '0011223344556677', 'initialhash'].join('$')
    const updatedHash = ['scrypt', '0011223344556677', 'newhash'].join('$')
    const created = await createTestDriver(db, {
      email: 'settings.repo@estrada.com.br',
      passwordHash: initialHash,
    })

    const updatedProfile = repository.updateProfile(created.id, {
      name: 'João Caminhoneiro',
      rntrc: '99.111.222-TAC',
      vehicleModel: 'Volvo FH540 6x4 (2023)',
      vehiclePlates: 'XYZ-1A23 / ABC-9087',
      updatedAt: '2026-09-18T10:00:00.000Z',
    })
    expect(updatedProfile?.name).toBe('João Caminhoneiro')
    expect(updatedProfile?.rntrc).toBe('99.111.222-TAC')
    expect(updatedProfile?.vehicleModel).toBe('Volvo FH540 6x4 (2023)')
    expect(updatedProfile?.vehiclePlates).toBe('XYZ-1A23 / ABC-9087')

    const updatedEmailOnly = repository.updateCredentials(created.id, {
      email: '  NOVO.EMAIL@ESTRADA.COM.BR  ',
      updatedAt: '2026-09-18T10:05:00.000Z',
    })
    expect(updatedEmailOnly?.email).toBe('novo.email@estrada.com.br')
    expect(updatedEmailOnly?.passwordHash).toBe(initialHash)

    const updatedWithPassword = repository.updateCredentials(created.id, {
      email: 'novo.email@estrada.com.br',
      passwordHash: updatedHash,
      updatedAt: '2026-09-18T10:06:00.000Z',
    })
    expect(updatedWithPassword?.passwordHash).toBe(updatedHash)

    const updatedTargets = repository.updateTelemetryTargets(created.id, {
      targetConsumptionMilliKml: 2650,
      maxCostPerKmCents: 580,
      updatedAt: '2026-09-18T10:10:00.000Z',
    })
    expect(updatedTargets?.targetConsumptionMilliKml).toBe(2650)
    expect(updatedTargets?.maxCostPerKmCents).toBe(580)

    expect(
      repository.updateProfile(999_999, {
        name: 'Inexistente',
        rntrc: '00.000.000-TAC',
        vehicleModel: 'Scania',
        vehiclePlates: 'AAA-0000',
        updatedAt: '2026-09-18T10:00:00.000Z',
      }),
    ).toBeUndefined()
    expect(
      repository.updateCredentials(999_999, {
        email: 'ninguem@estrada.com.br',
        updatedAt: '2026-09-18T10:00:00.000Z',
      }),
    ).toBeUndefined()
    expect(
      repository.updateTelemetryTargets(999_999, {
        targetConsumptionMilliKml: 2350,
        maxCostPerKmCents: 510,
        updatedAt: '2026-09-18T10:00:00.000Z',
      }),
    ).toBeUndefined()
  })
})
