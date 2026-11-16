import { randomBytes } from 'node:crypto'
import { expect, test } from '@nuxt/test-utils/playwright'
import { createTestDriver, createTestExpense } from '../../server/database/seed'
import { DEFAULT_DRIVER_SECRET } from '../../server/database/seed-data'
import { ensureE2eDatabaseReady, loginWithCredentials, openE2eDatabase } from './helpers/auth'

async function createIsolatedExpensesFixture() {
  const uniqueEmail = `exp.${Date.now()}.${randomBytes(4).toString('hex')}@estrada.com.br`
  const db = openE2eDatabase()
  try {
    const driver = await createTestDriver(db, {
      name: 'Marcelo Dias',
      email: uniqueEmail,
    })
    const initialExpense = createTestExpense(db, driver.id, {
      expenseDate: '2026-09-12',
      category: 'manutencao',
      description: 'Oficina Scania Ribeirão - Revisão Freios',
      amountCents: 84000,
      fuelLitersDeciliters: null,
      paymentMethod: 'cartao_debito',
      receiptReference: 'NF-e 4431',
    })
    return { driver, initialExpense }
  } finally {
    db.$client.close()
  }
}

test.describe('Diário Contábil de Despesas Operacionais (/expenses)', () => {
  test.beforeAll(async () => {
    await ensureE2eDatabaseReady()
  })

  test('lança despesa pelo botão global, filtra categorias, valida R$/L, edita e exclui', async ({
    page,
    goto,
  }) => {
    const { driver, initialExpense } = await createIsolatedExpensesFixture()

    await loginWithCredentials(page, goto, driver.email, DEFAULT_DRIVER_SECRET)
    await expect(page.getByTestId('sidebar-expenses-count')).toHaveText('1')

    await page.getByTestId('open-expense-modal-btn').click()
    const createDialog = page.getByRole('dialog', { name: 'Lançar Nova Despesa' })
    await expect(createDialog).toBeVisible()
    await expect(page.getByTestId('expense-liters-input')).toBeEnabled()

    await page.getByTestId('expense-category-select').selectOption('manutencao')
    await expect(page.getByTestId('expense-liters-input')).toBeDisabled()
    await expect(page.getByTestId('expense-liters-input')).toHaveValue('')

    await page.getByTestId('expense-category-select').selectOption('combustivel')
    await expect(page.getByTestId('expense-liters-input')).toBeEnabled()

    await page.getByTestId('expense-date-input').fill('2026-09-16')
    await page
      .getByTestId('expense-description-input')
      .fill('Posto Graal Rodovia dos Bandeirantes KM 56')
    await page.getByTestId('expense-liters-input').fill('500')
    await page.getByTestId('expense-amount-input').fill('2400')
    await page.getByTestId('expense-payment-select').selectOption('cartao_frota')
    await page.getByTestId('expense-receipt-input').fill('NF-e 8912')
    await page.getByTestId('expense-submit-btn').click()

    await expect(page.getByText('Despesa lançada com sucesso.', { exact: true })).toBeVisible()
    await expect(createDialog).toBeHidden()
    await expect(page.getByTestId('sidebar-expenses-count')).toHaveText('2')

    await page.getByTestId('nav-expenses').click()
    await expect(page).toHaveURL(/\/expenses$/)
    await expect(page.getByRole('heading', { name: 'Despesas Operacionais' })).toBeVisible()

    await expect(page.getByTestId('expense-filter-todas')).toHaveText('TODAS (2)')
    await expect(page.getByTestId('expense-filter-combustivel')).toHaveText('Combustível (1)')
    await expect(page.getByTestId('expense-filter-manutencao')).toHaveText('Manutenção (1)')

    const table = page.getByTestId('expenses-table')
    await expect(table).toContainText('Posto Graal Rodovia dos Bandeirantes KM 56')
    await expect(table).toContainText('500,0 L')
    await expect(table).toContainText('R$ 4,80')
    await expect(table).toContainText('R$ 2.400,00')
    await expect(table).toContainText('Cartão Frota')
    await expect(table).toContainText('NF-e 8912')

    await page.getByTestId('expense-filter-combustivel').click()
    await expect(table).toContainText('Posto Graal Rodovia dos Bandeirantes KM 56')
    await expect(page.getByTestId(`expense-row-${initialExpense.id}`)).toHaveCount(0)
    await expect(page.getByTestId('expense-filter-todas')).toHaveText('TODAS (2)')
    await expect(page.getByTestId('expense-filter-manutencao')).toHaveText('Manutenção (1)')

    await page.getByTestId('expense-filter-todas').click()
    await expect(page.getByTestId(`expense-row-${initialExpense.id}`)).toBeVisible()

    const fuelRow = page
      .locator('tbody tr')
      .filter({ hasText: 'Posto Graal Rodovia dos Bandeirantes KM 56' })
    await fuelRow.getByRole('button', { name: /Editar despesa/i }).click()

    const editDialog = page.getByRole('dialog', { name: 'Editar Despesa' })
    await expect(editDialog).toBeVisible()
    await page.getByTestId('expense-amount-input').fill('2500')
    await page.getByTestId('expense-receipt-input').fill('NF-e 9000')
    await page.getByTestId('expense-submit-btn').click()

    await expect(page.getByText('Despesa atualizada com sucesso.', { exact: true })).toBeVisible()
    await expect(editDialog).toBeHidden()
    await expect(fuelRow).toContainText('R$ 2.500,00')
    await expect(fuelRow).toContainText('R$ 5,00')
    await expect(fuelRow).toContainText('NF-e 9000')

    await goto('/expenses', { waitUntil: 'hydration' })
    await expect(table).toContainText('R$ 2.500,00')
    await expect(table).toContainText('NF-e 9000')

    await fuelRow.getByRole('button', { name: /Excluir despesa/i }).click()
    await expect(
      page.getByText('Despesa excluída do diário contábil.', { exact: true }),
    ).toBeVisible()
    await expect(table).not.toContainText('Posto Graal Rodovia dos Bandeirantes KM 56')
    await expect(page.getByTestId('expense-filter-todas')).toHaveText('TODAS (1)')
    await expect(page.getByTestId('expense-filter-combustivel')).toHaveText('Combustível (0)')
    await expect(page.getByTestId('sidebar-expenses-count')).toHaveText('1')
  })
})
