import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import Database, { type Database as SqliteDatabase } from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'

export type AppDatabase = BetterSQLite3Database<typeof schema> & {
  $client: SqliteDatabase
}

const DEFAULT_DATABASE_PATH = './.data/sqlite/estrada.db'
const SQLITE_BUSY_TIMEOUT_MS = 5000

let singletonDatabase: AppDatabase | null = null

function resolveConfiguredDatabasePath(): string {
  try {
    const config = useRuntimeConfig()
    if (typeof config.databaseUrl === 'string' && config.databaseUrl.trim().length > 0) {
      return config.databaseUrl.trim()
    }
  } catch {
    // Fallback seguro quando executado fora do contexto Nitro (ex.: scripts CLI ou testes unitários).
  }

  return DEFAULT_DATABASE_PATH
}

/**
 * Cria uma instância isolada do Drizzle + better-sqlite3 aplicando pragmas de durabilidade e integridade.
 */
export function createDatabaseClient(dbPath: string): AppDatabase {
  const isMemory = dbPath === ':memory:'

  if (!isMemory && !dbPath.startsWith('file:')) {
    mkdirSync(dirname(dbPath), { recursive: true })
  }

  const sqlite = new Database(dbPath)

  if (!isMemory) {
    sqlite.pragma('journal_mode = WAL')
    sqlite.pragma('synchronous = NORMAL')
  }

  sqlite.pragma('foreign_keys = ON')
  sqlite.pragma(`busy_timeout = ${SQLITE_BUSY_TIMEOUT_MS}`)

  return drizzle(sqlite, { schema })
}

/**
 * Retorna a instância singleton do banco SQLite configurada pelo runtimeConfig do servidor.
 */
export function getDatabase(): AppDatabase {
  if (!singletonDatabase) {
    singletonDatabase = createDatabaseClient(resolveConfiguredDatabasePath())
  }

  return singletonDatabase
}

/**
 * Encerra e limpa o singleton de conexão exclusivamente para isolamento entre testes automatizados.
 */
export function resetDatabaseSingletonForTests(): void {
  if (singletonDatabase) {
    singletonDatabase.$client.close()
    singletonDatabase = null
  }
}

/**
 * Executa uma ação de CLI (migration ou seed) quando o módulo é invocado diretamente via tsx.
 */
export async function runCliDatabaseAction(
  entryUrl: string,
  dbPath: string,
  action: (db: AppDatabase) => void | Promise<void>,
): Promise<void> {
  const isDirectExecution =
    typeof process.argv[1] === 'string' && entryUrl === pathToFileURL(resolve(process.argv[1])).href

  if (!isDirectExecution) {
    return
  }

  const cliDb = createDatabaseClient(dbPath)
  try {
    await action(cliDb)
  } finally {
    cliDb.$client.close()
  }
}
