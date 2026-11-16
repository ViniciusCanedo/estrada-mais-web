import { randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { expect, test } from '@nuxt/test-utils/playwright'
import { createTestDriver, createTestExpense, createTestTrip } from '../../server/database/seed'
import { DEFAULT_DRIVER_SECRET } from '../../server/database/seed-data'
import { ensureE2eDatabaseReady, loginWithCredentials, openE2eDatabase } from './helpers/auth'

async function createIsolatedReportDriver() {
  const uniqueEmail = `dash.${Date.now()}.${randomBytes(4).toString('hex')}@estrada.com.br`
  const db = openE2eDatabase()
  try {
    const driver = await createTestDriver(db, {
      name: 'Cláudio Nogueira',
      email: uniqueEmail,
      rntrc: '66.555.444-TAC',
      vehiclePlates: 'ABC-1D23 / XYZ-9876',
    })

    createTestTrip(db, driver.id, {
      tripDate: '2026-09-15',
      invoiceNumber: '77101',
      originCity: 'Santos',
      originState: 'SP',
      destinationCity: 'Curitiba',
      destinationState: 'PR',
      kmStart: 100000,
      kmEnd: 101000,
      distanceKm: 1000,
      fuelLitersDeciliters: 4000,
      freightValueCents: 1000000,
    })
    createTestExpense(db, driver.id, {
      expenseDate: '2026-09-16',
      category: 'combustivel',
      description: '=SUM(1,1) Posto Graal',
      amountCents: 240000,
      fuelLitersDeciliters: 5000,
      receiptReference: 'NF-e 77101',
    })

    createTestTrip(db, driver.id, {
      tripDate: '2026-08-20',
      invoiceNumber: '77050',
      originCity: 'Curitiba',
      originState: 'PR',
      destinationCity: 'Joinville',
      destinationState: 'SC',
      kmStart: 99500,
      kmEnd: 100000,
      distanceKm: 500,
      fuelLitersDeciliters: 2000,
      freightValueCents: 400000,
    })
    createTestExpense(db, driver.id, {
      expenseDate: '2026-08-21',
      category: 'pedagio',
      description: 'Pedágio Agosto',
      amountCents: 150000,
      fuelLitersDeciliters: null,
      receiptReference: 'Extrato',
    })

    return driver
  } finally {
    db.$client.close()
  }
}

test.describe('Painel Principal, Competência Mensal e Exportação Contábil', () => {
  test.beforeAll(async () => {
    await ensureE2eDatabaseReady()
  })

  test('atualiza indicadores ao trocar competência mensal, baixa CSV válido e abre /reports/print', async ({
    page,
    goto,
  }) => {
    const driver = await createIsolatedReportDriver()
    await loginWithCredentials(page, goto, driver.email, DEFAULT_DRIVER_SECRET)

    await expect(page.getByTestId('active-competence-label')).toHaveText('SETEMBRO 2026')
    await expect(page.getByTestId('hero-cost-per-km-value')).toHaveText('R$ 2,40')
    await expect(page.getByTestId('stat-card-km-driven')).toContainText('1.000')
    await expect(page.getByTestId('recent-trips-card')).toContainText('Santos, SP → Curitiba, PR')
    await expect(page.getByTestId('recent-trips-view-all')).toContainText('Ver todas (1)')
    await expect(page.getByTestId('recent-expenses-card')).toContainText('=SUM(1,1) Posto Graal')
    await expect(page.getByTestId('recent-expenses-view-all')).toContainText('Ver todas (1)')

    await page.getByTestId('prev-month-btn').click()
    await expect(page.getByTestId('active-competence-label')).toHaveText('AGOSTO 2026')
    await expect(page.getByTestId('hero-cost-per-km-value')).toHaveText('R$ 3,00')
    await expect(page.getByTestId('stat-card-km-driven')).toContainText('500')
    await expect(page.getByTestId('recent-trips-card')).toContainText(
      'Curitiba, PR → Joinville, SC',
    )

    await page.getByTestId('next-month-btn').click()
    await expect(page.getByTestId('active-competence-label')).toHaveText('SETEMBRO 2026')
    await expect(page.getByTestId('hero-cost-per-km-value')).toHaveText('R$ 2,40')

    await page.getByTestId('nav-settings').click()
    await expect(page).toHaveURL(/\/settings$/)
    await expect(page.getByTestId('settings-accounting-export-card')).toBeVisible()

    const csvResponse = await page.request.get('/api/reports/csv?month=2026-09')
    expect(csvResponse.status()).toBe(200)
    expect(csvResponse.headers()['content-type']).toContain('text/csv')
    expect(csvResponse.headers()['content-disposition']).toBe(
      'attachment; filename="estrada-mais-relatorio-2026-09.csv"',
    )

    const downloadPromise = page.waitForEvent('download')
    await page.getByTestId('export-csv-btn').click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe('estrada-mais-relatorio-2026-09.csv')
    const downloadedPath = await download.path()
    if (!downloadedPath) {
      throw new Error('Arquivo CSV baixado sem caminho temporário disponível.')
    }
    const csvContent = readFileSync(downloadedPath, 'utf8')
    expect(csvContent.startsWith('\uFEFF')).toBe(true)
    expect(csvContent).toContain('Cláudio Nogueira;RNTRC;66.555.444-TAC')
    expect(csvContent).toContain("'=SUM(1,1) Posto Graal")

    await page.getByTestId('export-print-pdf-btn').click()
    await expect(page).toHaveURL(/\/reports\/print\?month=2026-09$/)
    await expect(page.getByTestId('print-report-header')).toContainText('Cláudio Nogueira')
    await expect(page.getByTestId('print-report-header')).toContainText('66.555.444-TAC')
    await expect(page.getByTestId('print-report-header')).toContainText('ABC-1D23 / XYZ-9876')
    await expect(page.getByTestId('print-trips-table')).toContainText('Santos, SP → Curitiba, PR')
    await expect(page.getByTestId('print-expenses-table')).toContainText('=SUM(1,1) Posto Graal')
    await expect(page.getByTestId('trigger-print-btn')).toBeVisible()
  })
})
