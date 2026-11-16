import { randomBytes } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import { expect, test } from '@nuxt/test-utils/playwright'
import { expenses, trips } from '../../server/database/schema'
import { createTestDriver, createTestTrip } from '../../server/database/seed'
import { DEFAULT_DRIVER_SECRET } from '../../server/database/seed-data'
import { ensureE2eDatabaseReady, loginWithCredentials, openE2eDatabase } from './helpers/auth'

async function provisionIsolatedTripsDriver() {
  const uniqueEmail = `trips.${Date.now()}.${randomBytes(4).toString('hex')}@estrada.com.br`
  const db = openE2eDatabase()
  try {
    const driver = await createTestDriver(db, {
      name: 'Marcos Estrada',
      email: uniqueEmail,
    })

    createTestTrip(db, driver.id, {
      tripDate: '2026-09-15',
      invoiceNumber: '10824',
      originCity: 'Santos',
      originState: 'SP',
      destinationCity: 'Rondonópolis',
      destinationState: 'MT',
      cargoWeightKg: 32400,
      freightValueCents: 1850000,
      tollCostCents: 41200,
      kmStart: 780000,
      kmEnd: 781740,
      distanceKm: 1740,
      fuelLitersDeciliters: 7220,
      fuelCostCents: 346500,
    })

    createTestTrip(db, driver.id, {
      tripDate: '2026-09-11',
      invoiceNumber: '10819',
      originCity: 'Cascavel',
      originState: 'PR',
      destinationCity: 'Paranaguá',
      destinationState: 'PR',
      cargoWeightKg: 36000,
      freightValueCents: 680000,
      tollCostCents: 18400,
      kmStart: 779480,
      kmEnd: 780000,
      distanceKm: 520,
      fuelLitersDeciliters: 2039,
      fuelCostCents: 98000,
    })

    createTestTrip(db, driver.id, {
      tripDate: '2026-07-18',
      invoiceNumber: '10690',
      originCity: 'Goiânia',
      originState: 'GO',
      destinationCity: 'Ribeirão Preto',
      destinationState: 'SP',
      cargoWeightKg: 33200,
      freightValueCents: 980000,
      tollCostCents: 21500,
      kmStart: 778780,
      kmEnd: 779480,
      distanceKm: 700,
      fuelLitersDeciliters: 2980,
      fuelCostCents: 143000,
    })

    return driver
  } finally {
    db.$client.close()
  }
}

function queryTripAndExpensesByInvoice(driverId: number, invoiceNumber: string) {
  const db = openE2eDatabase()
  try {
    const trip = db
      .select()
      .from(trips)
      .where(and(eq(trips.driverId, driverId), eq(trips.invoiceNumber, invoiceNumber)))
      .get()
    const linkedExpenses = trip
      ? db.select().from(expenses).where(eq(expenses.tripId, trip.id)).all()
      : []
    return { trip, linkedExpenses }
  } finally {
    db.$client.close()
  }
}

test.describe('Gestão de Viagens e Telemetria (/trips)', () => {
  test.beforeAll(async () => {
    await ensureE2eDatabaseReady()
  })

  test('executa criação com cálculo ao vivo, filtros/ordenação, edição e exclusão com cascata', async ({
    page,
    goto,
  }) => {
    const driver = await provisionIsolatedTripsDriver()
    await loginWithCredentials(page, goto, driver.email, DEFAULT_DRIVER_SECRET)

    await expect(page.getByTestId('sidebar-trips-count')).toHaveText('2')
    await expect(page.getByTestId('sidebar-expenses-count')).toHaveText('0')

    // Abre modal global pela Top Bar e valida odômetro inválido em tempo real
    await page.getByTestId('open-trip-modal-btn').click()
    const tripDialog = page.getByRole('dialog', { name: 'Registrar Nova Viagem' })
    await expect(tripDialog).toBeVisible()

    await page.getByTestId('trip-date-input').fill('2026-09-17')
    await page.getByTestId('trip-invoice-input').fill('99881')
    await page.getByTestId('trip-origin-input').fill('Uberlândia, MG')
    await page.getByTestId('trip-destination-input').fill('Campinas, SP')
    await page.getByTestId('trip-cargo-input').fill('28.5')
    await page.getByTestId('trip-freight-input').fill('6200')
    await page.getByTestId('trip-toll-input').fill('152')
    await page.getByTestId('trip-km-start-input').fill('784320')
    await page.getByTestId('trip-km-end-input').fill('784000')
    await page.getByTestId('trip-fuel-liters-input').fill('722')
    await page.getByTestId('trip-fuel-cost-input').fill('3465')

    await expect(page.getByTestId('trip-live-distance')).toHaveText('Inválido (End ≤ Start)')
    await page.getByTestId('trip-modal-submit-btn').click()
    await expect(
      tripDialog.getByText(
        'O KM final deve ser maior que o KM inicial (odômetro não pode retroceder).',
      ),
    ).toBeVisible()

    // Corrige KM final para cálculo válido e salva
    await page.getByTestId('trip-km-end-input').fill('786060')
    await expect(page.getByTestId('trip-live-distance')).toHaveText('1.740 km')
    await expect(page.getByTestId('trip-live-efficiency')).toHaveText('2,41 km/L')
    await page.getByTestId('trip-modal-submit-btn').click()

    await expect(page.getByText('Viagem registrada com sucesso.', { exact: true })).toBeVisible()
    await expect(tripDialog).toBeHidden()
    await expect(page.getByTestId('sidebar-trips-count')).toHaveText('3')
    await expect(page.getByTestId('sidebar-expenses-count')).toHaveText('2')

    const afterCreate = queryTripAndExpensesByInvoice(driver.id, '99881')
    expect(afterCreate.trip?.distanceKm).toBe(1740)
    expect(afterCreate.linkedExpenses.map((item) => item.category).sort()).toEqual([
      'combustivel',
      'pedagio',
    ])

    // Navega para /trips e valida tabela, filtros e ordenação
    await page.getByTestId('nav-trips').click()
    await expect(page).toHaveURL(/\/trips$/)
    await expect(page.getByRole('heading', { name: 'Viagens Registradas' })).toBeVisible()
    await expect(page.getByTestId('trip-row')).toHaveCount(3)
    await expect(page.getByTestId('trips-summary-footer')).toContainText(
      'TOTAIS (3 VIAGENS EXIBIDAS)',
    )

    await page.getByTestId('trips-state-filter-MT').click()
    await expect(page.getByTestId('trip-row')).toHaveCount(1)
    await expect(page.getByTestId('trips-summary-footer')).toContainText(
      'TOTAIS (1 VIAGEM EXIBIDA)',
    )

    await page.getByTestId('trips-state-filter-TODOS').click()
    await expect(page.getByTestId('trip-row')).toHaveCount(3)

    await page.getByTestId('trips-period-select').selectOption('last90days')
    await expect(page.getByTestId('trip-row')).toHaveCount(4)

    await page.getByTestId('trips-period-select').selectOption('month')
    await expect(page.getByTestId('trip-row')).toHaveCount(3)

    await page.getByTestId('trips-search-input').fill('Uberlândia')
    await expect(page.getByTestId('trip-row')).toHaveCount(1)
    await page.getByTestId('trips-search-input').fill('')
    await expect(page.getByTestId('trip-row')).toHaveCount(3)

    await page.getByTestId('sort-distanceKm').click()
    await expect(page.getByTestId('trip-row').first()).toContainText('1.740 km')

    // Edita a viagem criada zerando o pedágio
    const targetRow = page
      .getByTestId('trip-row')
      .filter({ hasText: 'Uberlândia, MG → Campinas, SP' })
    await targetRow.getByTestId('edit-trip-btn').click()

    const editDialog = page.getByRole('dialog', { name: 'Editar Viagem' })
    await expect(editDialog).toBeVisible()
    await page.getByTestId('trip-destination-input').fill('Ribeirão Preto, SP')
    await page.getByTestId('trip-toll-input').fill('0')
    await page.getByTestId('trip-modal-submit-btn').click()

    await expect(page.getByText('Viagem atualizada com sucesso.', { exact: true })).toBeVisible()
    await expect(page.getByTestId('sidebar-expenses-count')).toHaveText('1')

    const editedRow = page
      .getByTestId('trip-row')
      .filter({ hasText: 'Uberlândia, MG → Ribeirão Preto, SP' })
    await expect(editedRow).toBeVisible()

    const afterEdit = queryTripAndExpensesByInvoice(driver.id, '99881')
    expect(afterEdit.linkedExpenses).toHaveLength(1)
    expect(afterEdit.linkedExpenses[0]?.category).toBe('combustivel')

    // Exclui a viagem e comprova remoção em cascata no SQLite e atualização da Sidebar
    await editedRow.getByTestId('delete-trip-btn').click()
    await expect(page.getByTestId('delete-trip-confirm-text')).toBeVisible()
    await page.getByTestId('confirm-delete-trip-btn').click()

    await expect(page.getByText('Viagem excluída com sucesso.', { exact: true })).toBeVisible()
    await expect(page.getByTestId('trip-row')).toHaveCount(2)
    await expect(page.getByTestId('trips-summary-footer')).toContainText(
      'TOTAIS (2 VIAGENS EXIBIDAS)',
    )
    await expect(page.getByTestId('sidebar-trips-count')).toHaveText('2')
    await expect(page.getByTestId('sidebar-expenses-count')).toHaveText('0')

    const afterDelete = queryTripAndExpensesByInvoice(driver.id, '99881')
    expect(afterDelete.trip).toBeUndefined()
    expect(afterDelete.linkedExpenses).toHaveLength(0)
  })
})
