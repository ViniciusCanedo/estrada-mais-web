import { randomBytes } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { expect, test } from '@nuxt/test-utils/playwright'
import { passwordResetTokens } from '../../server/database/schema'
import { createTestDriver, createTestResetToken } from '../../server/database/seed'
import { DEFAULT_DRIVER_EMAIL, DEFAULT_DRIVER_SECRET } from '../../server/database/seed-data'
import { hashTokenSha256 } from '../../server/utils/password'
import { ensureE2eDatabaseReady, loginWithCredentials, openE2eDatabase } from './helpers/auth'

const WRONG_E2E_CREDENTIAL = ['SenhaIncorreta', '2026'].join('@')
const NEW_E2E_CREDENTIAL = ['NovaSenhaE2E', '2026'].join('@')
const MISMATCH_E2E_CREDENTIAL = ['OutraSenhaE2E', '2026'].join('@')

test.describe('Autenticação, Proteção de Rotas, Rate Limiting e Recuperação de Senha', () => {
  test.beforeAll(async () => {
    await ensureE2eDatabaseReady()
  })

  test('redireciona usuário não autenticado das rotas operacionais para /login', async ({
    page,
    goto,
  }) => {
    await goto('/', { waitUntil: 'hydration' })
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByTestId('screen-login')).toBeVisible()

    await goto('/trips', { waitUntil: 'hydration' })
    await expect(page).toHaveURL(/\/login$/)

    await goto('/expenses', { waitUntil: 'hydration' })
    await expect(page).toHaveURL(/\/login$/)

    await goto('/settings', { waitUntil: 'hydration' })
    await expect(page).toHaveURL(/\/login$/)
  })

  test('realiza login válido, exibe perfil real na Sidebar e encerra sessão via Desconectar', async ({
    page,
    goto,
  }) => {
    await goto('/login', { waitUntil: 'hydration' })

    await page.getByTestId('login-email-input').fill(DEFAULT_DRIVER_EMAIL)
    await page.getByTestId('login-password-input').fill(DEFAULT_DRIVER_SECRET)
    await page.getByTestId('login-submit-btn').click()

    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByTestId('sidebar-driver-name')).toHaveText('Valdir Silveira')
    await expect(page.getByTestId('sidebar-driver-vehicle')).toHaveText('Scania R450 • 6x2')
    await expect(page.getByTestId('sidebar-driver-initials')).toHaveText('VS')
    await expect(page.getByTestId('sidebar-trips-count')).toHaveText(/^[1-9]\d*$/)
    await expect(page.getByTestId('sidebar-expenses-count')).toHaveText(/^[1-9]\d*$/)

    await page.getByTestId('logout-btn').click()
    await expect(page).toHaveURL(/\/login$/)

    await goto('/', { waitUntil: 'hydration' })
    await expect(page).toHaveURL(/\/login$/)
  })

  test('aplica rate limit após 5 falhas de login e retorna HTTP 429 na 6ª tentativa', async ({
    page,
    goto,
  }) => {
    const isolatedEmail = `ratelimit.${Date.now()}.${randomBytes(3).toString('hex')}@estrada.com.br`
    await goto('/login', { waitUntil: 'hydration' })

    await page.getByTestId('login-email-input').fill(isolatedEmail)
    await page.getByTestId('login-password-input').fill(WRONG_E2E_CREDENTIAL)

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const responsePromise = page.waitForResponse(
        (response) =>
          response.url().includes('/api/auth/login') && response.request().method() === 'POST',
      )
      await page.getByTestId('login-submit-btn').click()
      const response = await responsePromise
      expect(response.status()).toBe(401)
      await expect(page.getByTestId('login-error-alert')).toContainText(
        'E-mail ou senha inválidos.',
      )
    }

    const blockedResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/auth/login') && response.request().method() === 'POST',
    )
    await page.getByTestId('login-submit-btn').click()
    const blockedResponse = await blockedResponsePromise
    expect(blockedResponse.status()).toBe(429)
    await expect(page.getByTestId('login-error-alert')).toContainText('Muitas tentativas de login')
  })

  test('executa solicitação de Magic Link, redefinição de senha e bloqueio de reuso com motorista isolado', async ({
    page,
    goto,
  }) => {
    const isolatedEmail = `reset.${Date.now()}.${randomBytes(3).toString('hex')}@estrada.com.br`
    const knownRawToken = randomBytes(32).toString('hex')
    const db = openE2eDatabase()
    let isolatedDriverId: number

    try {
      const driver = await createTestDriver(db, {
        name: 'Marcos Ribeiro',
        email: isolatedEmail,
        vehicleModel: 'Volvo FH540 6x4 (2022)',
      })
      isolatedDriverId = driver.id
    } finally {
      db.$client.close()
    }

    await goto('/login', { waitUntil: 'hydration' })
    await page.getByTestId('forgot-password-link').click()
    await expect(page).toHaveURL(/\/forgot-password$/)

    await page.getByTestId('forgot-email-input').fill(isolatedEmail)
    await page.getByTestId('forgot-submit-btn').click()
    await expect(page.getByTestId('forgot-success-alert')).toContainText(
      'Se o e-mail estiver cadastrado',
    )

    const tokenDb = openE2eDatabase()
    try {
      const generatedTokens = tokenDb
        .select()
        .from(passwordResetTokens)
        .where(eq(passwordResetTokens.driverId, isolatedDriverId))
        .all()
      expect(generatedTokens.length).toBeGreaterThanOrEqual(1)

      createTestResetToken(tokenDb, isolatedDriverId, {
        tokenHash: hashTokenSha256(knownRawToken),
      })
    } finally {
      tokenDb.$client.close()
    }

    await goto(`/reset-password?token=${knownRawToken}`, { waitUntil: 'hydration' })
    await page.getByTestId('reset-password-input').fill(NEW_E2E_CREDENTIAL)
    await page.getByTestId('reset-confirm-password-input').fill(MISMATCH_E2E_CREDENTIAL)
    await page.getByTestId('reset-submit-btn').click()
    await expect(page.getByTestId('screen-reset-password')).toContainText(
      'As senhas informadas não coincidem.',
    )

    await page.getByTestId('reset-confirm-password-input').fill(NEW_E2E_CREDENTIAL)
    await page.getByTestId('reset-confirm-password-input').blur()
    await expect(page.getByTestId('screen-reset-password')).not.toContainText(
      'As senhas informadas não coincidem.',
    )
    await page.getByTestId('reset-submit-btn').click()
    await expect(page).toHaveURL(/\/login\?reset=success$/)
    await expect(page.getByTestId('login-reset-success-alert')).toBeVisible()

    await loginWithCredentials(page, goto, isolatedEmail, NEW_E2E_CREDENTIAL)
    await expect(page.getByTestId('sidebar-driver-name')).toHaveText('Marcos Ribeiro')
    await expect(page.getByTestId('sidebar-driver-vehicle')).toHaveText('Volvo FH540 • 6x4')
    await expect(page.getByTestId('sidebar-driver-initials')).toHaveText('MR')

    await page.getByTestId('logout-btn').click()
    await expect(page).toHaveURL(/\/login$/)

    await goto(`/reset-password?token=${knownRawToken}`, { waitUntil: 'hydration' })
    await page.getByTestId('reset-password-input').fill(MISMATCH_E2E_CREDENTIAL)
    await page.getByTestId('reset-confirm-password-input').fill(MISMATCH_E2E_CREDENTIAL)
    await page.getByTestId('reset-submit-btn').click()
    await expect(page.getByTestId('reset-error-alert')).toContainText(
      'Token de recuperação inválido',
    )
  })
})
