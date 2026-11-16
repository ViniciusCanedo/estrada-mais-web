import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import Database from 'better-sqlite3'

const MAX_SNAPSHOTS = 14
const SNAPSHOT_PATTERN =
  /^(?:pre-deploy-\d{8}-\d{6}|backup-\d{4}-\d{2}-\d{2})(?:-[a-zA-Z0-9]+)?\.db$/

function padTwo(value) {
  return String(value).padStart(2, '0')
}

function buildSnapshotFilename(now, isDaily) {
  const year = String(now.getUTCFullYear())
  const month = padTwo(now.getUTCMonth() + 1)
  const day = padTwo(now.getUTCDate())

  if (isDaily) {
    return `backup-${year}-${month}-${day}.db`
  }

  const hours = padTwo(now.getUTCHours())
  const minutes = padTwo(now.getUTCMinutes())
  const seconds = padTwo(now.getUTCSeconds())

  return `pre-deploy-${year}${month}${day}-${hours}${minutes}${seconds}.db`
}

function pruneExcessSnapshots(backupDir) {
  const snapshots = readdirSync(backupDir)
    .filter((entry) => SNAPSHOT_PATTERN.test(entry))
    .sort((left, right) => right.localeCompare(left))

  const removedFiles = snapshots.slice(MAX_SNAPSHOTS)
  for (const staleFile of removedFiles) {
    rmSync(join(backupDir, staleFile), { force: true })
  }

  return {
    keptCount: snapshots.slice(0, MAX_SNAPSHOTS).length,
    removedFiles,
  }
}

async function runOnlineBackup() {
  const sourcePath = process.env.NUXT_DATABASE_URL || './.data/sqlite/estrada.db'
  if (!existsSync(sourcePath)) {
    throw new Error(`Banco SQLite de origem não encontrado em: ${sourcePath}`)
  }

  const backupDir = process.env.NUXT_BACKUP_DIR || join(dirname(sourcePath), 'backups')
  mkdirSync(backupDir, { recursive: true })

  const isDaily = process.argv.includes('--daily')
  const filename = buildSnapshotFilename(new Date(), isDaily)
  const backupPath = join(backupDir, filename)

  const db = new Database(sourcePath, { readonly: true, fileMustExist: true })
  try {
    await db.backup(backupPath)
  } finally {
    db.close()
  }

  const retention = pruneExcessSnapshots(backupDir)
  process.stdout.write(
    `${JSON.stringify({
      level: 'info',
      timestamp: new Date().toISOString(),
      message: 'Backup online SQLite concluído com sucesso',
      sourcePath,
      backupPath,
      keptSnapshots: retention.keptCount,
      removedSnapshots: retention.removedFiles.length,
    })}\n`,
  )
}

runOnlineBackup().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  process.stderr.write(
    `${JSON.stringify({
      level: 'error',
      timestamp: new Date().toISOString(),
      message: 'Falha ao executar backup online do SQLite',
      error: message,
    })}\n`,
  )
  process.exit(1)
})
