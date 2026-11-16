import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  backupSqliteDatabase,
  createDatabaseClient,
  resetDatabaseSingletonForTests,
} from '../../server/database/client'
import { runMigrations } from '../../server/database/migrate'
import { drivers, trips } from '../../server/database/schema'
import { createTestDriver, createTestTrip } from '../../server/database/seed'
import {
  DEFAULT_BACKUP_RETENTION_COUNT,
  formatBackupFilename,
  isManagedBackupFilename,
  pruneOldBackups,
} from '../../server/utils/backup-retention'

function createDummySnapshots(backupDir: string, filenames: string[]): void {
  filenames.forEach((filename) => {
    writeFileSync(join(backupDir, filename), 'sqlite-snapshot-placeholder')
  })
}

describe('Backup Online do SQLite e Retenção de 14 Snapshots', () => {
  const tempDirs: string[] = []

  afterEach(() => {
    resetDatabaseSingletonForTests()
    tempDirs.splice(0).forEach((dir) => {
      rmSync(dir, { recursive: true, force: true })
    })
  })

  it('deve formatar nomes de snapshot pre-deploy-YYYYMMDD-HHMMSS.db e backup-YYYY-MM-DD.db em UTC', () => {
    const referenceDate = new Date('2026-09-17T14:05:09.000Z')

    expect(formatBackupFilename(referenceDate, 'pre-deploy')).toBe('pre-deploy-20260917-140509.db')
    expect(formatBackupFilename(referenceDate, 'backup')).toBe('backup-2026-09-17.db')
    expect(isManagedBackupFilename('pre-deploy-20260917-140509.db')).toBe(true)
    expect(isManagedBackupFilename('backup-2026-09-17.db')).toBe(true)
    expect(isManagedBackupFilename('estrada.db')).toBe(false)
    expect(isManagedBackupFilename('notas.txt')).toBe(false)
  })

  it('deve retornar listas vazias em pruneOldBackups quando o diretório de backups não existir', () => {
    const baseDir = mkdtempSync(join(tmpdir(), 'estrada-backup-empty-'))
    tempDirs.push(baseDir)
    const missingDir = join(baseDir, 'inexistente')

    const result = pruneOldBackups(missingDir)

    expect(result).toEqual({ keptFiles: [], removedFiles: [] })
  })

  it('deve manter exatamente os 14 snapshots mais recentes e remover os excedentes mais antigos', () => {
    const backupDir = mkdtempSync(join(tmpdir(), 'estrada-backup-retention-'))
    tempDirs.push(backupDir)

    const allSixteenSnapshots = [
      'pre-deploy-20260901-120000.db',
      'pre-deploy-20260902-120000.db',
      'pre-deploy-20260903-120000.db',
      'pre-deploy-20260904-120000.db',
      'pre-deploy-20260905-120000.db',
      'pre-deploy-20260906-120000.db',
      'pre-deploy-20260907-120000.db',
      'pre-deploy-20260908-120000.db',
      'pre-deploy-20260909-120000.db',
      'pre-deploy-20260910-120000.db',
      'pre-deploy-20260911-120000.db',
      'pre-deploy-20260912-120000.db',
      'pre-deploy-20260913-120000.db',
      'pre-deploy-20260914-120000.db',
      'pre-deploy-20260915-120000.db',
      'pre-deploy-20260916-120000.db',
    ]
    createDummySnapshots(backupDir, [...allSixteenSnapshots, 'README.keep'])

    const result = pruneOldBackups(backupDir, DEFAULT_BACKUP_RETENTION_COUNT)

    expect(result.keptFiles).toHaveLength(14)
    expect(result.removedFiles).toEqual([
      'pre-deploy-20260902-120000.db',
      'pre-deploy-20260901-120000.db',
    ])
    expect(existsSync(join(backupDir, 'pre-deploy-20260901-120000.db'))).toBe(false)
    expect(existsSync(join(backupDir, 'pre-deploy-20260902-120000.db'))).toBe(false)
    expect(existsSync(join(backupDir, 'pre-deploy-20260916-120000.db'))).toBe(true)
    expect(existsSync(join(backupDir, 'README.keep'))).toBe(true)
  })

  it('deve realizar backup online atômico de banco SQLite ativo em modo WAL preservando dados de drivers e trips', async () => {
    const baseDir = mkdtempSync(join(tmpdir(), 'estrada-wal-backup-'))
    tempDirs.push(baseDir)
    const sourcePath = join(baseDir, 'estrada.db')
    const backupDir = join(baseDir, 'backups')

    const liveDb = createDatabaseClient(sourcePath)
    runMigrations(liveDb)

    const driver = await createTestDriver(liveDb, {
      name: 'Valdir Silveira Backup WAL',
      email: 'valdir.backup@estrada.com.br',
    })
    const trip = createTestTrip(liveDb, driver.id, {
      originCity: 'Rondonópolis',
      originState: 'MT',
      destinationCity: 'Santos',
      destinationState: 'SP',
      kmStart: 120000,
      kmEnd: 121450,
    })

    const backupResult = await backupSqliteDatabase({
      sourcePath,
      backupDir,
      prefix: 'pre-deploy',
      now: new Date('2026-09-17T18:30:00.000Z'),
    })

    expect(backupResult.filename).toBe('pre-deploy-20260917-183000.db')
    expect(existsSync(backupResult.backupPath)).toBe(true)
    expect(readdirSync(backupDir)).toEqual(['pre-deploy-20260917-183000.db'])

    const restoredDb = createDatabaseClient(backupResult.backupPath)
    const restoredDrivers = restoredDb.select().from(drivers).all()
    const restoredTrips = restoredDb.select().from(trips).all()

    expect(restoredDrivers).toHaveLength(1)
    expect(restoredDrivers[0]?.name).toBe('Valdir Silveira Backup WAL')
    expect(restoredTrips).toHaveLength(1)
    expect(restoredTrips[0]?.id).toBe(trip.id)
    expect(restoredTrips[0]?.distanceKm).toBe(1450)

    restoredDb.$client.close()
    liveDb.$client.close()
  })

  it('deve falhar com mensagem descritiva quando o arquivo SQLite de origem não existir', async () => {
    const baseDir = mkdtempSync(join(tmpdir(), 'estrada-missing-src-'))
    tempDirs.push(baseDir)
    const nonExistentSource = join(baseDir, 'nao-existe.db')

    await expect(
      backupSqliteDatabase({
        sourcePath: nonExistentSource,
      }),
    ).rejects.toThrow('Arquivo de banco SQLite de origem não encontrado')
  })
})
