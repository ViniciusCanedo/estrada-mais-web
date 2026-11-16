import { expect, test } from '@nuxt/test-utils/playwright'

test.describe('Shell Night Highway, Navegação e Modais Globais', () => {
  test('navega entre telas pela Sidebar atualizando breadcrumb e rota ativa', async ({
    page,
    goto,
  }) => {
    await goto('/', { waitUntil: 'hydration' })

    await expect(page.getByTestId('top-bar-breadcrumb')).toHaveText('PAINEL PRINCIPAL')
    await expect(page.getByTestId('nav-dashboard')).toHaveAttribute('aria-current', 'page')
    await expect(page.getByTestId('sync-status-indicator')).toContainText('SYNC OK')

    await page.getByTestId('nav-trips').click()
    await expect(page).toHaveURL(/\/trips$/)
    await expect(page.getByTestId('top-bar-breadcrumb')).toHaveText('VIAGENS (HISTÓRICO COMPLETO)')
    await expect(page.getByTestId('nav-trips')).toHaveAttribute('aria-current', 'page')
    await expect(page.getByRole('heading', { name: 'Viagens Registradas' })).toBeVisible()

    await page.getByTestId('nav-expenses').click()
    await expect(page).toHaveURL(/\/expenses$/)
    await expect(page.getByTestId('top-bar-breadcrumb')).toHaveText('DESPESAS OPERACIONAIS')
    await expect(page.getByTestId('nav-expenses')).toHaveAttribute('aria-current', 'page')
    await expect(page.getByRole('heading', { name: 'Despesas Operacionais' })).toBeVisible()

    await page.getByTestId('nav-settings').click()
    await expect(page).toHaveURL(/\/settings$/)
    await expect(page.getByTestId('top-bar-breadcrumb')).toHaveText('CONFIGURAÇÕES')
    await expect(page.getByTestId('nav-settings')).toHaveAttribute('aria-current', 'page')
  })

  test('alterna o seletor global de competência mensal e fecha modais globais com Escape', async ({
    page,
    goto,
  }) => {
    await goto('/', { waitUntil: 'hydration' })

    await expect(page.getByTestId('active-competence-label')).toHaveText('SETEMBRO 2026')

    await page.getByTestId('next-month-btn').click()
    await expect(page.getByTestId('active-competence-label')).toHaveText('OUTUBRO 2026')

    await page.getByTestId('prev-month-btn').click()
    await page.getByTestId('prev-month-btn').click()
    await expect(page.getByTestId('active-competence-label')).toHaveText('AGOSTO 2026')

    await page.getByTestId('open-expense-modal-btn').click()
    const expenseDialog = page.getByRole('dialog', { name: 'Lançar Nova Despesa' })
    await expect(expenseDialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(expenseDialog).toBeHidden()

    await page.getByTestId('open-trip-modal-btn').click()
    const tripDialog = page.getByRole('dialog', { name: 'Registrar Nova Viagem' })
    await expect(tripDialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(tripDialog).toBeHidden()
  })

  test('oculta o item Sistema de Design na Sidebar e redireciona /design-system em produção', async ({
    page,
    goto,
  }) => {
    await goto('/', { waitUntil: 'hydration' })
    await expect(page.getByTestId('nav-design-system')).toHaveCount(0)

    await goto('/design-system', { waitUntil: 'hydration' })
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByTestId('top-bar-breadcrumb')).toHaveText('PAINEL PRINCIPAL')
  })
})
