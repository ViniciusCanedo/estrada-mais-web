import { expect, test } from '@nuxt/test-utils/playwright'

test('renderiza a página inicial com status saudável do endpoint /api/health e SQLite conectado', async ({
  page,
  goto,
}) => {
  await goto('/', { waitUntil: 'hydration' })

  await expect(page.getByRole('heading', { name: 'Estrada+ Telemetria' })).toBeVisible()
  await expect(page.getByTestId('health-status-value')).toContainText('ok')
  await expect(page.getByTestId('health-database-value')).toContainText('connected')

  await page.getByTestId('manual-fetch-btn').click()
  await expect(page.getByTestId('manual-health-timestamp')).toBeVisible()
})
