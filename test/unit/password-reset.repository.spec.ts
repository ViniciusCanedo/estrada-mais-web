import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createDatabaseClient,
  getDatabase,
  resetDatabaseSingletonForTests,
  type AppDatabase,
} from '../../server/database/client'
import { runMigrations } from '../../server/database/migrate'
import { passwordResetTokens } from '../../server/database/schema'
import { createTestDriver, createTestResetToken } from '../../server/database/seed'
import { PasswordResetRepository } from '../../server/repositories/password-reset.repository'
import { hashTokenSha256 } from '../../server/utils/password'

describe('PasswordResetRepository (SQLite :memory:)', () => {
  let db: AppDatabase
  let repository: PasswordResetRepository

  beforeEach(() => {
    db = createDatabaseClient(':memory:')
    runMigrations(db)
    repository = new PasswordResetRepository(db)
  })

  afterEach(() => {
    resetDatabaseSingletonForTests()
    vi.unstubAllGlobals()
    if (db.$client.open) {
      db.$client.close()
    }
  })

  it('deve criar token e localizar somente tokens não usados e não expirados', async () => {
    const driver = await createTestDriver(db)
    const activeHash = hashTokenSha256('token-ativo-123')
    const expiredHash = hashTokenSha256('token-expirado-123')

    repository.createToken({
      driverId: driver.id,
      tokenHash: activeHash,
      expiresAt: '2026-09-16T13:00:00.000Z',
      createdAt: '2026-09-16T12:30:00.000Z',
    })
    createTestResetToken(db, driver.id, {
      tokenHash: expiredHash,
      expiresAt: '2026-09-16T12:00:00.000Z',
    })

    const nowIso = '2026-09-16T12:40:00.000Z'
    const validRow = repository.findValidByHash(activeHash, nowIso)
    const expiredRow = repository.findValidByHash(expiredHash, nowIso)

    expect(validRow?.driverId).toBe(driver.id)
    expect(validRow?.usedAt).toBeNull()
    expect(expiredRow).toBeUndefined()

    repository.markAsUsed(validRow?.id ?? 0, nowIso)
    expect(repository.findValidByHash(activeHash, nowIso)).toBeUndefined()
  })

  it('deve invalidar apenas tokens pendentes do motorista informado', async () => {
    const driverA = await createTestDriver(db)
    const driverB = await createTestDriver(db)

    const tokenA1 = createTestResetToken(db, driverA.id, {
      tokenHash: hashTokenSha256('token-a-1'),
      expiresAt: '2026-09-16T14:00:00.000Z',
    })
    const tokenB1 = createTestResetToken(db, driverB.id, {
      tokenHash: hashTokenSha256('token-b-1'),
      expiresAt: '2026-09-16T14:00:00.000Z',
    })

    repository.invalidatePendingByDriver(driverA.id, '2026-09-16T12:15:00.000Z')

    const reloadedA1 = db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.id, tokenA1.id))
      .get()
    const reloadedB1 = db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.id, tokenB1.id))
      .get()

    expect(reloadedA1?.usedAt).toBe('2026-09-16T12:15:00.000Z')
    expect(reloadedB1?.usedAt).toBeNull()
  })

  it('deve utilizar singleton getDatabase quando nenhuma instância é injetada', async () => {
    vi.stubGlobal('useRuntimeConfig', () => ({ databaseUrl: ':memory:' }))
    const singletonDb = getDatabase()
    runMigrations(singletonDb)
    const driver = await createTestDriver(singletonDb)
    const tokenHash = hashTokenSha256('token-singleton')

    const defaultRepo = new PasswordResetRepository()
    defaultRepo.createToken({
      driverId: driver.id,
      tokenHash,
      expiresAt: '2026-09-16T14:00:00.000Z',
      createdAt: '2026-09-16T13:30:00.000Z',
    })

    expect(defaultRepo.findValidByHash(tokenHash, '2026-09-16T13:35:00.000Z')?.driverId).toBe(
      driver.id,
    )
  })
})
