import { runMigrations } from '../database/migrate'

/**
 * Executa migrations pendentes automaticamente durante o boot do servidor Nitro.
 */
export default defineNitroPlugin(() => {
  try {
    runMigrations()
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    process.stderr.write(`Falha crítica ao aplicar migrations SQLite no boot: ${message}\n`)
    throw error
  }
})
