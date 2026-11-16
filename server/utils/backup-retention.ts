import { existsSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

export const DEFAULT_BACKUP_RETENTION_COUNT = 14

export type BackupSnapshotPrefix = 'pre-deploy' | 'backup'

export interface BackupRetentionResult {
  keptFiles: string[]
  removedFiles: string[]
}

const MANAGED_BACKUP_FILENAME_PATTERN =
  /^(?:pre-deploy-\d{8}-\d{6}|backup-\d{4}-\d{2}-\d{2})(?:-[a-zA-Z0-9]+)?\.db$/

function padTwoDigits(value: number): string {
  return String(value).padStart(2, '0')
}

/**
 * Formata o nome canônico de um arquivo de snapshot SQLite em UTC.
 */
export function formatBackupFilename(
  date: Date = new Date(),
  prefix: BackupSnapshotPrefix = 'pre-deploy',
): string {
  const year = String(date.getUTCFullYear())
  const month = padTwoDigits(date.getUTCMonth() + 1)
  const day = padTwoDigits(date.getUTCDate())

  if (prefix === 'backup') {
    return `backup-${year}-${month}-${day}.db`
  }

  const hours = padTwoDigits(date.getUTCHours())
  const minutes = padTwoDigits(date.getUTCMinutes())
  const seconds = padTwoDigits(date.getUTCSeconds())

  return `pre-deploy-${year}${month}${day}-${hours}${minutes}${seconds}.db`
}

/**
 * Identifica se o nome de arquivo segue o padrão gerenciado pela rotina de backup SQLite.
 */
export function isManagedBackupFilename(filename: string): boolean {
  return MANAGED_BACKUP_FILENAME_PATTERN.test(filename)
}

/**
 * Remove snapshots antigos excedentes preservando apenas os N mais recentes (padrão: 14).
 */
export function pruneOldBackups(
  backupDir: string,
  maxSnapshots: number = DEFAULT_BACKUP_RETENTION_COUNT,
): BackupRetentionResult {
  if (!existsSync(backupDir)) {
    return { keptFiles: [], removedFiles: [] }
  }

  const safeLimit = Math.max(1, maxSnapshots)
  const sortedSnapshots = readdirSync(backupDir)
    .filter((entry) => isManagedBackupFilename(entry))
    .sort((left, right) => right.localeCompare(left))

  const keptFiles = sortedSnapshots.slice(0, safeLimit)
  const removedFiles = sortedSnapshots.slice(safeLimit)

  for (const oldFile of removedFiles) {
    rmSync(join(backupDir, oldFile), { force: true })
  }

  return { keptFiles, removedFiles }
}
