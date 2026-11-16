import { expect, test } from '@nuxt/test-utils/playwright'
import { loginAsDefaultDriver } from './helpers/auth'

test('exibe o Painel Principal de Setembro 2026 para Valdir Silveira com indicadores, gráfico e tabelas', async ({
  page,
  goto,
}) => {
  await loginAsDefaultDriver(page, goto)

  await expect(page.getByTestId('active-competence-label')).toHaveText('SETEMBRO 2026')
  await expect(page.getByTestId('hero-cost-card')).toContainText('Custo Médio Operacional')
  await expect(page.getByTestId('dashboard-max-cost-badge')).toHaveText('META: ≤ R$ 5,10')
  await expect(page.getByTestId('dashboard-consumption-target')).toHaveText('Meta 2,35 km/L')

  await expect(page.getByTestId('secondary-stat-grid')).toContainText('KM RODADOS')
  await expect(page.getByTestId('secondary-stat-grid')).toContainText('3.755')
  await expect(page.getByTestId('secondary-stat-grid')).toContainText('SOBRA LÍQUIDA')

  await expect(page.getByTestId('chart-cost-trend')).toContainText(
    'Evolução do Custo por KM (Últimos 6 Meses)',
  )
  await expect(page.getByTestId('cost-trend-svg')).toBeVisible()
  await expect(page.getByTestId('trend-bar-2026-09')).toBeVisible()

  await expect(page.getByTestId('recent-trips-card')).toContainText('Últimas Viagens Registradas')
  await expect(page.getByTestId('recent-trip-row')).toHaveCount(5)
  await expect(page.getByTestId('recent-expenses-card')).toContainText(
    'Últimas Despesas Operacionais',
  )
  await expect(page.getByTestId('recent-expense-row')).toHaveCount(5)
})
