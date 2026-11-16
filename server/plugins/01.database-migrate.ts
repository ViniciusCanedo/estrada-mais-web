import { runMigrations } from '../database/migrate'
import { logger } from '../utils/logger'

/**
 * Executa migrations pendentes automaticamente durante o boot do servidor Nitro.
 */
export default defineNitroPlugin(() => {
  try {
    runMigrations()
  } catch (error: unknown) {
    logger.error('Falha crítica ao aplicar migrations SQLite no boot', {
      component: 'database-migrate',
      error,
    })
    throw error
  }
})
