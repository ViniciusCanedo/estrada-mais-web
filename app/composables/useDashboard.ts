import type { NuxtError } from '#app'
import {
  computed,
  getCurrentInstance,
  onServerPrefetch,
  ref,
  watch,
  type ComputedRef,
  type Ref,
} from 'vue'
import type { ExpenseDto, ExpenseListResponse } from '#shared/schemas/expense.schema'
import type { DashboardApiResponse, DashboardFullPayload } from '#shared/schemas/report.schema'
import type { TripDto, TripListResponse } from '#shared/schemas/trip.schema'
import { useApiFetch } from './useApiFetch'
import { useCompetencePeriod } from './useCompetencePeriod'

export const DASHBOARD_CACHE_KEY = 'dashboard-summary'
export const DASHBOARD_DIRTY_STATE_KEY = 'estrada-dashboard-dirty'

export interface DashboardState {
  dashboard: ComputedRef<DashboardFullPayload | null>
  pending: ComputedRef<boolean>
  error: Ref<NuxtError<unknown> | undefined>
  refresh: () => Promise<void>
}

export interface PrintReportState {
  dashboard: ComputedRef<DashboardFullPayload | null>
  trips: ComputedRef<TripDto[]>
  expenses: ComputedRef<ExpenseDto[]>
  pending: ComputedRef<boolean>
  error: ComputedRef<NuxtError<unknown> | undefined>
  refresh: () => Promise<void>
}

/**
 * Marca o Painel Principal como desatualizado e dispara refresh imediato se estiver ativo.
 */
export async function invalidateDashboardCache(clearImmediately = false): Promise<void> {
  if (typeof useState === 'function') {
    useState<boolean>(DASHBOARD_DIRTY_STATE_KEY, () => false).value = !clearImmediately
  }
  if (clearImmediately && typeof clearNuxtData === 'function') {
    clearNuxtData(DASHBOARD_CACHE_KEY)
  }
  if (typeof refreshNuxtData === 'function') {
    await refreshNuxtData(DASHBOARD_CACHE_KEY)
  }
}

/**
 * Consome o sinalizador de cache sujo no cliente e limpa a entrada Nuxt antes de nova leitura.
 */
export function consumeDirtyCacheFlag(flagKey: string, cacheKey: string): Ref<boolean> {
  const dirtyFlag =
    typeof useState === 'function' ? useState<boolean>(flagKey, () => false) : ref(false)
  if (import.meta.client && dirtyFlag.value && typeof clearNuxtData === 'function') {
    dirtyFlag.value = false
    clearNuxtData(cacheKey)
  }
  return dirtyFlag
}

/**
 * Busca os dados consolidados do Painel Principal de forma reativa ao mês da Top Bar.
 */
export function useDashboard(): DashboardState {
  const { selectedMonth } = useCompetencePeriod()
  const dashboardDirty = consumeDirtyCacheFlag(DASHBOARD_DIRTY_STATE_KEY, DASHBOARD_CACHE_KEY)

  const asyncData = useApiFetch<DashboardApiResponse>('/reports/dashboard', {
    key: DASHBOARD_CACHE_KEY,
    query: computed(() => ({ month: selectedMonth.value })),
  })

  if (getCurrentInstance()) {
    onServerPrefetch(async () => {
      await asyncData
    })
  }

  watch(asyncData.data, () => {
    dashboardDirty.value = false
  })

  return {
    dashboard: computed(() => asyncData.data.value?.data ?? null),
    pending: computed(() => asyncData.status.value === 'pending'),
    error: asyncData.error,
    refresh: async (): Promise<void> => {
      dashboardDirty.value = false
      await asyncData.refresh()
    },
  }
}

/**
 * Carrega resumo contábil e listas completas de viagens e despesas para a página de impressão A4.
 */
export function usePrintReport(reportMonth: Ref<string>): PrintReportState {
  const summaryQuery = computed(() => ({ month: reportMonth.value }))
  const tripsQuery = computed(() => ({ month: reportMonth.value, period: 'month' }))
  const expensesQuery = computed(() => ({ month: reportMonth.value, category: 'todas' }))

  const summaryData = useApiFetch<DashboardApiResponse>('/reports/dashboard', {
    key: 'print-report-summary',
    query: summaryQuery,
  })
  const tripsData = useApiFetch<TripListResponse>('/trips', {
    key: 'print-report-trips',
    query: tripsQuery,
  })
  const expensesData = useApiFetch<ExpenseListResponse>('/expenses', {
    key: 'print-report-expenses',
    query: expensesQuery,
  })

  if (getCurrentInstance()) {
    onServerPrefetch(async () => {
      await Promise.all([summaryData, tripsData, expensesData])
    })
  }

  return {
    dashboard: computed(() => summaryData.data.value?.data ?? null),
    trips: computed(() => tripsData.data.value?.data ?? []),
    expenses: computed(() => expensesData.data.value?.data ?? []),
    pending: computed(
      () =>
        summaryData.status.value === 'pending' ||
        tripsData.status.value === 'pending' ||
        expensesData.status.value === 'pending',
    ),
    error: computed(
      () => summaryData.error.value ?? tripsData.error.value ?? expensesData.error.value,
    ),
    refresh: async (): Promise<void> => {
      await Promise.all([summaryData.refresh(), tripsData.refresh(), expensesData.refresh()])
    },
  }
}
