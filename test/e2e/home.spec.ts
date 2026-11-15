import { expect, test } from '@nuxt/test-utils/playwright'

test('renderiza a página inicial e incrementa o contador Pinia', async ({ page, goto }) => {
  await goto('/', { waitUntil: 'hydration' })

  await expect(page.getByRole('heading', { name: 'Nuxt 4 Scaffolding' })).toBeVisible()
  await expect(page.getByTestId('counter-value')).toContainText('0')

  await page.getByTestId('increment-btn').click()
  await expect(page.getByTestId('counter-value')).toContainText('1')
})
