import { resolve } from 'node:path'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { getDatabase, runCliDatabaseAction, type AppDatabase } from './client'

const DEFAULT_MIGRATIONS_FOLDER = resolve(process.cwd(), 'server/database/migrations')

/**
 * Executa todas as migrations SQL pendentes sobre a instância informada ou sobre o singleton do servidor.
 */
export function runMigrations(
  database?: AppDatabase,
  migrationsFolder = DEFAULT_MIGRATIONS_FOLDER,
): void {
  const db = database ?? getDatabase()
  migrate(db, { migrationsFolder })
}

const cliDbPath = process.env.NUXT_DATABASE_URL || './.data/sqlite/estrada.db'
void runCliDatabaseAction(import.meta.url, cliDbPath, (cliDb) => {
  runMigrations(cliDb)
  process.stdout.write(`Migrations SQLite aplicadas com sucesso em: ${cliDbPath}\n`)
})
