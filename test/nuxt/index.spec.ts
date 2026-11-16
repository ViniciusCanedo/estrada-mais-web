import type { NuxtError } from '#app'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DashboardFullPayload } from '#shared/schemas/report.schema'
import AppRoot from '~/app.vue'
import { useAuthSession } from '~/composables/useAuthSession'
import { useCompetencePeriod } from '~/composables/useCompetencePeriod'
import { DASHBOARD_CACHE_KEY } from '~/composables/useDashboard'
import { useGlobalModals } from '~/composables/useGlobalModals'
import ErrorPage from '~/error.vue'
import DefaultLayout from '~/layouts/default.vue'
import IndexPage from '~/pages/index.vue'

let dashboardMode: 'full' | 'empty' | 'error' | 'unavailable' | 'delayed' = 'full'
let resolveDelayed: (() => void) | null = null

const MOCK_SESSION_USER = {
  id: 1,
  name: 'Valdir Silveira',
  email: 'valdir.silveira.truck@estrada.com.br',
  initials: 'VS',
  vehicleSummary: 'Scania R450 • 6x2',
}

const FULL_DASHBOARD: DashboardFullPayload = {
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
    tireShop: { totalReais: 180, recordsCount: 1, lastDescription: 'Borracharia do Gaúcho' },
    maintenance: { totalReais: 840, recordsCount: 1, lastDescription: 'Scania Ribeirão' },
    food: { totalReais: 95, daysCount: 1, dailyAverageReais: 95 },
    netMargin: {
      netMarginReais: 31700,
      grossFreightReais: 44300,
      totalExpensesReais: 12600,
      marginPercent: 71.6,
    },
  },
  trendSixMonths: [
    {
      month: '2026-09',
      label: 'SET (ATUAL)',
      totalCostPerKmReais: 4.82,
      dieselPerKmReais: 3,
      tollPerKmReais: 0.8,
      maintenanceOthersPerKmReais: 1.02,
      isAboveTarget: false,
      isCurrent: true,
    },
  ],
  recentTripsCount: 5,
  recentExpensesCount: 15,
  recentTrips: [],
  recentExpenses: [],
}

const EMPTY_DASHBOARD: DashboardFullPayload = {
  ...FULL_DASHBOARD,
  stats: {
    ...FULL_DASHBOARD.stats,
    kmDriven: { totalKm: 0, deltaKmVsPrevious: 0 },
    dieselAverage: { kmPerLiter: 0, targetKmPerLiter: 2.35, isTargetMet: false },
  },
  recentTripsCount: 0,
  recentExpensesCount: 0,
}

registerEndpoint('/api/auth/me', () => ({ data: MOCK_SESSION_USER }))
registerEndpoint('/api/auth/logout', () => ({ success: true }))
registerEndpoint('/api/health', () => ({
  status: 'ok',
  database: 'connected',
  timestamp: '2026-09-16T12:00:00.000Z',
  navigationCounts: { tripsCount: 5, expensesCount: 15 },
}))
registerEndpoint('/api/reports/dashboard', async () => {
  if (dashboardMode === 'delayed') {
    await new Promise<void>((resolve) => {
      resolveDelayed = resolve
    })
  }
  if (dashboardMode === 'error') {
    throw createError({ statusCode: 500, statusMessage: 'Internal Server Error' })
  }
  if (dashboardMode === 'unavailable') {
    return { data: null }
  }
  return { data: dashboardMode === 'empty' ? EMPTY_DASHBOARD : FULL_DASHBOARD }
})

describe('Página Inicial e Componentes Globais (Nuxt Runtime)', () => {
  beforeEach(() => {
    dashboardMode = 'full'
    resolveDelayed = null
    clearNuxtData(DASHBOARD_CACHE_KEY)
    useCompetencePeriod().setMonth('2026-09')
    useGlobalModals().closeModals()
    const auth = useAuthSession()
    auth.user.value = { ...MOCK_SESSION_USER }
    auth.hasLoadedSession.value = true
  })

  it('renderiza estados de carregamento, erro, vazio com atalhos e painel consolidado em index.vue', async () => {
    dashboardMode = 'error'
    const errorWrapper = await mountSuspended(IndexPage)
    await vi.waitFor(() => {
      expect(errorWrapper.find('[data-testid="dashboard-error-state"]').exists()).toBe(true)
    })

    dashboardMode = 'full'
    await errorWrapper.find('[data-testid="dashboard-retry-btn"]').trigger('click')
    await vi.waitFor(() => {
      expect(errorWrapper.find('[data-testid="dashboard-tables"]').exists()).toBe(true)
    })
    expect(errorWrapper.find('[data-testid="dashboard-max-cost-badge"]').text()).toBe(
      'META: ≤ R$ 5,10',
    )
    expect(errorWrapper.find('[data-testid="dashboard-consumption-target"]').text()).toBe(
      'Meta 2,35 km/L',
    )

    clearNuxtData(DASHBOARD_CACHE_KEY)
    dashboardMode = 'empty'
    const emptyWrapper = await mountSuspended(IndexPage)
    await vi.waitFor(() => {
      expect(emptyWrapper.find('[data-testid="dashboard-empty-state"]').exists()).toBe(true)
    })
    expect(emptyWrapper.find('[data-testid="dashboard-max-cost-badge"]').text()).toBe(
      'META: ≤ R$ 5,10',
    )
    await emptyWrapper.find('[data-testid="dashboard-empty-trip-btn"]').trigger('click')
    expect(useGlobalModals().isTripModalOpen.value).toBe(true)
    await emptyWrapper.find('[data-testid="dashboard-empty-expense-btn"]').trigger('click')
    expect(useGlobalModals().isExpenseModalOpen.value).toBe(true)

    clearNuxtData(DASHBOARD_CACHE_KEY)
    dashboardMode = 'unavailable'
    const unavailableWrapper = await mountSuspended(IndexPage)
    await vi.waitFor(() => {
      expect(unavailableWrapper.find('[data-testid="dashboard-unavailable-state"]').exists()).toBe(
        true,
      )
    })

    clearNuxtData(DASHBOARD_CACHE_KEY)
    dashboardMode = 'delayed'
    const loadingWrapper = await mountSuspended(IndexPage)
    expect(loadingWrapper.find('[data-testid="dashboard-loading-state"]').exists()).toBe(true)
    resolveDelayed?.()
    await flushPromises()
  })

  it('renderiza o layout padrão, AppRoot e ErrorPage corretamente', async () => {
    const layoutWrapper = await mountSuspended(DefaultLayout, {
      slots: { default: () => 'Conteúdo interno' },
    })
    expect(layoutWrapper.text()).toContain('Conteúdo interno')

    const appWrapper = await mountSuspended(AppRoot)
    expect(appWrapper.exists()).toBe(true)

    const mockError = {
      status: 404,
      statusCode: 404,
      statusMessage: 'Not Found',
      message: 'Page not found',
      name: 'NuxtError',
      fatal: false,
      unhandled: false,
      toJSON: () => ({ message: 'Page not found', statusCode: 404 }),
    } as unknown as NuxtError

    const errorWrapper = await mountSuspended(ErrorPage, { props: { error: mockError } })
    expect(errorWrapper.text()).toContain('404')
  })
})
