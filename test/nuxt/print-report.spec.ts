import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ExpenseListResponse } from '#shared/schemas/expense.schema'
import type { DashboardFullPayload } from '#shared/schemas/report.schema'
import type { TripListResponse } from '#shared/schemas/trip.schema'
import AccountingExportCard from '~/components/settings/AccountingExportCard.vue'
import { useCompetencePeriod } from '~/composables/useCompetencePeriod'
import PrintLayout from '~/layouts/print.vue'
import PrintReportPage from '~/pages/reports/print.vue'

const PRINT_DASHBOARD_MOCK: DashboardFullPayload = {
  month: '2026-09',
  monthLabel: 'SETEMBRO 2026',
  driverProfile: {
    name: 'Valdir Silveira',
    rntrc: '58.912.440-TAC',
    vehicleModel: 'Scania R450 Highline 6x2 (2021)',
    vehiclePlates: 'BRA-2E19 / CUR-4901',
  },
  hero: {
    costPerKmReais: 4.82,
    targetMaxCostPerKmReais: 5.1,
    deltaPercentVsPrevious: -4.1,
    deltaReaisPerKmVsPrevious: -0.21,
    previousMonthLabel: 'Agosto',
    proportions: { fuelPercent: 62, tollPercent: 18, maintenanceOthersPercent: 20 },
  },
  stats: {
    kmDriven: { totalKm: 3755, deltaKmVsPrevious: 3575 },
    dieselAverage: { kmPerLiter: 2.42, targetKmPerLiter: 2.35, isTargetMet: true },
    fuel: { totalReais: 9853, totalLiters: 2052.7, avgPricePerLiterReais: 4.8, refuelingsCount: 6 },
    tolls: { totalReais: 1632, costPerKmReais: 0.43, recordsCount: 6 },
    tireShop: { totalReais: 180, recordsCount: 1, lastDescription: 'Borracharia' },
    maintenance: { totalReais: 840, recordsCount: 1, lastDescription: 'Oficina' },
    food: { totalReais: 95, daysCount: 1, dailyAverageReais: 95 },
    netMargin: {
      netMarginReais: 31700,
      grossFreightReais: 44300,
      totalExpensesReais: 12600,
      marginPercent: 71.6,
    },
  },
  trendSixMonths: [],
  recentTripsCount: 1,
  recentExpensesCount: 1,
  recentTrips: [],
  recentExpenses: [],
}

let printMode: 'ok' | 'error' | 'empty' = 'ok'

registerEndpoint('/api/reports/dashboard', () => {
  if (printMode === 'error') {
    throw createError({ statusCode: 500, statusMessage: 'Internal Server Error' })
  }
  if (printMode === 'empty') {
    return { data: null }
  }
  return { data: PRINT_DASHBOARD_MOCK }
})

registerEndpoint('/api/trips', (): TripListResponse => ({
  data: [
    {
      id: 1,
      driverId: 1,
      tripDate: '2026-09-15',
      invoiceNumber: '10824',
      origin: 'Santos, SP',
      originCity: 'Santos',
      originState: 'SP',
      destination: 'Rondonópolis, MT',
      destinationCity: 'Rondonópolis',
      destinationState: 'MT',
      cargoWeightTons: 32.4,
      freightValueReais: 18500,
      tollCostReais: 412,
      kmStart: 784320,
      kmEnd: 786060,
      distanceKm: 1740,
      fuelLiters: 722,
      fuelCostReais: 3465,
      kmPerLiter: 2.41,
      costPerKmReais: 2.23,
      createdAt: '2026-09-16T12:00:00.000Z',
      updatedAt: '2026-09-16T12:00:00.000Z',
    },
  ],
  meta: {
    totalCount: 1,
    availableStates: ['MT', 'SP'],
    summary: {
      totalDistanceKm: 1740,
      weightedAverageKmL: 2.41,
      totalFuelCostReais: 3465,
      totalTollCostReais: 412,
      totalFreightValueReais: 18500,
      weightedCostPerKmReais: 2.23,
    },
  },
}))

registerEndpoint('/api/expenses', (): ExpenseListResponse => ({
  data: [
    {
      id: 1,
      driverId: 1,
      tripId: null,
      isTripLinked: false,
      expenseDate: '2026-09-16',
      category: 'combustivel',
      description: 'Posto Graal Rodovia dos Bandeirantes',
      amountReais: 2400,
      fuelLiters: 500,
      pricePerLiterReais: 4.8,
      paymentMethod: 'cartao_frota',
      receiptReference: 'NF-e 8912',
      receiptBadgeType: 'fiscal',
      createdAt: '2026-09-16T12:00:00.000Z',
      updatedAt: '2026-09-16T12:00:00.000Z',
    },
  ],
  meta: {
    totalCount: 1,
    totalAmountReais: 2400,
    countsByCategory: {
      todas: 1,
      combustivel: 1,
      pedagio: 0,
      borracharia: 0,
      manutencao: 0,
      alimentacao: 0,
      outros: 0,
    },
  },
}))

describe('Exportação Contábil e Relatório de Impressão A4 (Nuxt Runtime)', () => {
  beforeEach(() => {
    printMode = 'ok'
    clearNuxtData('print-report-summary')
    clearNuxtData('print-report-trips')
    clearNuxtData('print-report-expenses')
    useCompetencePeriod().setMonth('2026-09')
  })

  it('deve renderizar AccountingExportCard com links CSV e impressão para a competência ativa', async () => {
    const exportCard = await mountSuspended(AccountingExportCard, {
      props: { month: '2026-09', monthLabel: 'SETEMBRO 2026' },
    })

    expect(exportCard.find('[data-testid="export-csv-btn"]').attributes('href')).toBe(
      '/api/reports/csv?month=2026-09',
    )
    expect(exportCard.find('[data-testid="export-csv-btn"]').attributes('download')).toBe(
      'estrada-mais-relatorio-2026-09.csv',
    )
    expect(exportCard.find('[data-testid="export-print-pdf-btn"]').attributes('href')).toBe(
      '/reports/print?month=2026-09',
    )
  })

  it('deve renderizar layout e página de impressão A4 com estados e disparo de window.print()', async () => {
    const printLayoutWrapper = await mountSuspended(PrintLayout, {
      slots: { default: () => 'Relatório A4' },
    })
    expect(printLayoutWrapper.find('[data-testid="print-layout"]').exists()).toBe(true)

    const printMock = vi.fn()
    Object.defineProperty(window, 'print', { value: printMock, writable: true, configurable: true })

    printMode = 'error'
    const printErrorWrapper = await mountSuspended(PrintReportPage)
    await vi.waitFor(() => {
      expect(printErrorWrapper.find('[data-testid="print-error-state"]').exists()).toBe(true)
    })

    printMode = 'ok'
    await printErrorWrapper.find('[data-testid="print-retry-btn"]').trigger('click')
    await vi.waitFor(() => {
      expect(printErrorWrapper.find('[data-testid="print-report-header"]').exists()).toBe(true)
    })
    expect(printErrorWrapper.text()).toContain('Valdir Silveira')
    expect(printErrorWrapper.text()).toContain('58.912.440-TAC')
    expect(printErrorWrapper.find('[data-testid="print-trips-table"]').exists()).toBe(true)
    expect(printErrorWrapper.find('[data-testid="print-expenses-table"]').exists()).toBe(true)

    await printErrorWrapper.find('[data-testid="trigger-print-btn"]').trigger('click')
    expect(printMock).toHaveBeenCalledTimes(1)

    clearNuxtData('print-report-summary')
    printMode = 'empty'
    const printEmptyWrapper = await mountSuspended(PrintReportPage)
    await vi.waitFor(() => {
      expect(printEmptyWrapper.find('[data-testid="print-empty-state"]').exists()).toBe(true)
    })
  })
})
