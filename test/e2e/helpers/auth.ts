import { expect, type Page } from '@playwright/test'
import { createDatabaseClient, type AppDatabase } from '../../../server/database/client'
import { runMigrations } from '../../../server/database/migrate'
import { seedDatabase } from '../../../server/database/seed'
import { DEFAULT_DRIVER_EMAIL, DEFAULT_DRIVER_SECRET } from '../../../server/database/seed-data'

export const E2E_DATABASE_PATH = './.data/sqlite/estrada.db'

export type E2eGoto = (
  url: string,
  options?: {
    waitUntil?: 'hydration' | 'route' | 'load' | 'domcontentloaded' | 'networkidle' | 'commit'
  },
) => Promise<unknown>

/**
 * Abre cliente SQLite apontando para o banco usado pelo servidor E2E.
 */
export function openE2eDatabase(): AppDatabase {
  return createDatabaseClient(E2E_DATABASE_PATH)
}

/**
 * Garante migrations aplicadas e motorista padrão Valdir Silveira semeado de forma idempotente.
 */
export async function ensureE2eDatabaseReady(): Promise<void> {
  const db = openE2eDatabase()
  try {
    runMigrations(db)
    await seedDatabase(db)
  } finally {
    db.$client.close()
  }
}

/**
 * Executa o fluxo de login na interface /login com credenciais informadas.
 */
export async function loginWithCredentials(
  page: Page,
  goto: E2eGoto,
  email: string,
  secret: string,
): Promise<void> {
  await goto('/login', { waitUntil: 'hydration' })
  await page.getByTestId('login-email-input').fill(email)
  await page.getByTestId('login-password-input').fill(secret)
  await page.getByTestId('login-submit-btn').click()
  await expect(page).toHaveURL(/\/$/)
}

/**
 * Garante seed ativo e autentica o motorista padrão Valdir Silveira antes de navegar às telas operacionais.
 */
export async function loginAsDefaultDriver(page: Page, goto: E2eGoto): Promise<void> {
  await ensureE2eDatabaseReady()
  await loginWithCredentials(page, goto, DEFAULT_DRIVER_EMAIL, DEFAULT_DRIVER_SECRET)
}

export default async function globalSetup(): Promise<void> {
  await ensureE2eDatabaseReady()
}
