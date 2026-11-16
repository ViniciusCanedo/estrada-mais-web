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
})
