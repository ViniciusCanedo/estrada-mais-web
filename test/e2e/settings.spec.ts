import { randomBytes } from 'node:crypto'
import { expect, test } from '@nuxt/test-utils/playwright'
import type { NewDriverRow } from '../../server/database/schema'
import { createTestDriver } from '../../server/database/seed'
import { DEFAULT_DRIVER_SECRET } from '../../server/database/seed-data'
import { ensureE2eDatabaseReady, loginWithCredentials, openE2eDatabase } from './helpers/auth'

const WRONG_CURRENT_SECRET = ['SenhaErradaCfg', '2026'].join('@')
const UPDATED_DRIVER_SECRET = ['NovaSenhaCfgE2E', '2026'].join('@')

async function createIsolatedSettingsDriver(overrides: Partial<NewDriverRow> = {}) {
  const uniqueEmail = `cfg.${Date.now()}.${randomBytes(4).toString('hex')}@estrada.com.br`
  const db = openE2eDatabase()
  try {
    return await createTestDriver(db, {
      email: uniqueEmail,
      ...overrides,
    })
  } finally {
    db.$client.close()
  }
}

test.describe('Configurações e Perfil do Motorista (/settings)', () => {
  test.beforeAll(async () => {
    await ensureE2eDatabaseReady()
  })

  test('atualiza dados cadastrais em /settings e reflete imediatamente na Sidebar sem reload', async ({
    page,
    goto,
  }) => {
    const driver = await createIsolatedSettingsDriver({
      name: 'Carlos Mendes',
      vehicleModel: 'Volvo FH460 Globetrotter 6x2 (2021)',
    })

    await loginWithCredentials(page, goto, driver.email, DEFAULT_DRIVER_SECRET)
    await expect(page.getByTestId('sidebar-driver-name')).toHaveText('Carlos Mendes')
    await expect(page.getByTestId('sidebar-driver-initials')).toHaveText('CM')
    await expect(page.getByTestId('sidebar-driver-vehicle')).toHaveText('Volvo FH460 • 6x2')

    await page.getByTestId('nav-settings').click()
    await expect(page).toHaveURL(/\/settings$/)
    await expect(page.getByTestId('settings-biometric-note')).toContainText(
      'Desbloqueio biométrico (FaceID/Impressão digital) é exclusivo da versão mobile',
    )

    await page.getByTestId('settings-name-input').fill('Roberto Almeida')
    await page.getByTestId('settings-rntrc-input').fill('77.654.321-TAC')
    await page.getByTestId('settings-vehicle-model-input').fill('DAF XF530 Space 6x4 (2024)')
    await page.getByTestId('settings-vehicle-plates-input').fill('XYZ-9K88 / MNO-1234')
    await page.getByTestId('settings-save-profile-btn').click()

    await expect(
      page.getByText('Alterações cadastrais salvas com sucesso.', { exact: true }),
    ).toBeVisible()
    await expect(page.getByTestId('sidebar-driver-name')).toHaveText('Roberto Almeida')
    await expect(page.getByTestId('sidebar-driver-initials')).toHaveText('RA')
    await expect(page.getByTestId('sidebar-driver-vehicle')).toHaveText('DAF XF530 • 6x4')

    await goto('/settings', { waitUntil: 'hydration' })
    await expect(page.getByTestId('sidebar-driver-name')).toHaveText('Roberto Almeida')
    await expect(page.getByTestId('settings-name-input')).toHaveValue('Roberto Almeida')
    await expect(page.getByTestId('settings-rntrc-input')).toHaveValue('77.654.321-TAC')
  })

  test('valida senha atual, atualiza credenciais e autentica com a nova senha', async ({
    page,
    goto,
  }) => {
    const driver = await createIsolatedSettingsDriver({
      name: 'Fernando Costa',
    })
    const nextEmail = `novo.${Date.now()}.${randomBytes(3).toString('hex')}@estrada.com.br`

    await loginWithCredentials(page, goto, driver.email, DEFAULT_DRIVER_SECRET)
    await page.getByTestId('nav-settings').click()
    await expect(page).toHaveURL(/\/settings$/)

    await page.getByTestId('settings-email-input').fill(nextEmail)
    await page.getByTestId('settings-current-password-input').fill(WRONG_CURRENT_SECRET)
    await page.getByTestId('settings-new-password-input').fill(UPDATED_DRIVER_SECRET)
    await page.getByTestId('settings-save-credentials-btn').click()

    await expect(page.getByTestId('settings-credentials-error')).toContainText(
      'A senha atual informada está incorreta.',
    )

    await page.getByTestId('settings-current-password-input').fill(DEFAULT_DRIVER_SECRET)
    await page.getByTestId('settings-save-credentials-btn').click()
    await expect(
      page.getByText('Credenciais de acesso atualizadas com sucesso.', { exact: true }),
    ).toBeVisible()

    await page.getByTestId('logout-btn').click()
    await expect(page).toHaveURL(/\/login$/)

    await page.getByTestId('login-email-input').fill(nextEmail)
    await page.getByTestId('login-password-input').fill(DEFAULT_DRIVER_SECRET)
    await page.getByTestId('login-submit-btn').click()
    await expect(page.getByTestId('login-error-alert')).toContainText('E-mail ou senha inválidos.')

    await loginWithCredentials(page, goto, nextEmail, UPDATED_DRIVER_SECRET)
    await expect(page.getByTestId('sidebar-driver-name')).toHaveText('Fernando Costa')
  })

  test('atualiza metas de telemetria em /settings e reflete no Painel Principal (/)', async ({
    page,
    goto,
  }) => {
    const driver = await createIsolatedSettingsDriver({
      name: 'Paulo Teixeira',
    })

    await loginWithCredentials(page, goto, driver.email, DEFAULT_DRIVER_SECRET)
    await expect(page.getByTestId('dashboard-max-cost-badge')).toHaveText('META: ≤ R$ 5,10')
    await expect(page.getByTestId('dashboard-consumption-target')).toHaveText('Meta 2,35 km/L')

    await page.getByTestId('nav-settings').click()
    await expect(page).toHaveURL(/\/settings$/)

    await page.getByTestId('settings-target-consumption-slider').fill('2.6')
    await page.getByTestId('settings-max-cost-slider').fill('5.8')
    await expect(page.getByTestId('settings-target-consumption-value')).toHaveText('2,60 km/L')
    await expect(page.getByTestId('settings-max-cost-value')).toHaveText('R$ 5,80 / km')

    await page.getByTestId('settings-save-targets-btn').click()
    await expect(
      page.getByText('Metas operacionais atualizadas com sucesso.', { exact: true }),
    ).toBeVisible()

    await page.getByTestId('nav-dashboard').click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByTestId('dashboard-max-cost-badge')).toHaveText('META: ≤ R$ 5,80')
    await expect(page.getByTestId('dashboard-consumption-target')).toHaveText('Meta 2,60 km/L')

    await goto('/', { waitUntil: 'hydration' })
    await expect(page.getByTestId('dashboard-max-cost-badge')).toHaveText('META: ≤ R$ 5,80')
    await expect(page.getByTestId('dashboard-consumption-target')).toHaveText('Meta 2,60 km/L')
  })
})
