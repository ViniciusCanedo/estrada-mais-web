import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TripDto, TripListResponse } from '#shared/schemas/trip.schema'
import { calculateTripListSummary } from '#shared/utils/telematics'
import { resetTripsFilterState, TRIPS_LIST_CACHE_KEY, useTrips } from '~/composables/useTrips'
import { useCompetencePeriod } from '~/composables/useCompetencePeriod'
import { useGlobalModals } from '~/composables/useGlobalModals'
import TripsPage from '~/pages/trips.vue'

const MOCK_TRIPS: TripDto[] = [
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
    kmPerLiter: 1740 / 722,
    costPerKmReais: (3465 + 412) / 1740,
    createdAt: '2026-09-16T12:00:00.000Z',
    updatedAt: '2026-09-16T12:00:00.000Z',
  },
  {
    id: 2,
    driverId: 1,
    tripDate: '2026-09-11',
    invoiceNumber: null,
    origin: 'Cascavel, PR',
    originCity: 'Cascavel',
    originState: 'PR',
    destination: 'Paranaguá, PR',
    destinationCity: 'Paranaguá',
    destinationState: 'PR',
    cargoWeightTons: null,
    freightValueReais: 6800,
    tollCostReais: 184,
    kmStart: 783800,
    kmEnd: 784320,
    distanceKm: 520,
    fuelLiters: 203.9,
    fuelCostReais: 980,
    kmPerLiter: 520 / 203.9,
    costPerKmReais: (980 + 184) / 520,
    createdAt: '2026-09-16T12:00:00.000Z',
    updatedAt: '2026-09-16T12:00:00.000Z',
  },
]

let listMode: 'ok' | 'error' | 'empty' | 'delayed' = 'ok'
let failDelete = false
let resolveDelayed: (() => void) | null = null
let recordedQueries: Array<Record<string, unknown>> = []
let deletedIds: number[] = []
let tripsPool: TripDto[] = [...MOCK_TRIPS]

function hasPeriodQuery(period: string): boolean {
  return recordedQueries.some((q) => q.period === period)
}

function hasSortQuery(sortBy: string, sortDir: string): boolean {
  return recordedQueries.some((q) => q.sortBy === sortBy && q.sortDir === sortDir)
}

registerEndpoint('/api/health', () => ({
  status: 'ok',
  database: 'connected',
  timestamp: '2026-09-16T12:00:00.000Z',
  navigationCounts: { tripsCount: tripsPool.length, expensesCount: 10 },
}))

registerEndpoint('/api/trips', async (event) => {
  const url = new URL(event.node.req.url ?? '/api/trips', 'http://localhost')
  const query = Object.fromEntries(url.searchParams.entries())
  recordedQueries.push(query)

  if (listMode === 'delayed') {
    await new Promise<void>((resolve) => {
      resolveDelayed = resolve
    })
  }
  if (listMode === 'error') {
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Erro ao carregar viagens.',
    })
  }
  if (listMode === 'empty') {
    return {
      data: [],
      meta: {
        totalCount: 0,
        availableStates: ['MT', 'PR', 'SP'],
        summary: calculateTripListSummary([]),
      },
    } satisfies TripListResponse
  }

  let filtered = [...tripsPool]
  if (query.state && query.state !== 'TODOS') {
    filtered = filtered.filter(
      (trip) => trip.originState === query.state || trip.destinationState === query.state,
    )
  }
  if (query.search) {
    const needle = String(query.search).toLowerCase()
    filtered = filtered.filter(
      (trip) =>
        trip.origin.toLowerCase().includes(needle) ||
        trip.destination.toLowerCase().includes(needle) ||
        (trip.invoiceNumber?.toLowerCase().includes(needle) ?? false),
    )
  }

  return {
    data: filtered,
    meta: {
      totalCount: filtered.length,
      availableStates: ['MT', 'PR', 'SP'],
      summary: calculateTripListSummary(filtered),
    },
  } satisfies TripListResponse
})

registerEndpoint('/api/trips/1', {
  method: 'DELETE',
  handler: () => {
    if (failDelete) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Internal Server Error',
        message: 'Erro ao excluir viagem.',
      })
    }
    deletedIds.push(1)
    tripsPool = tripsPool.filter((trip) => trip.id !== 1)
    return { success: true }
  },
})

describe('Página /trips, Filtros e Tabela (test/nuxt/trips-page.spec.ts)', () => {
  beforeEach(() => {
    listMode = 'ok'
    failDelete = false
    resolveDelayed = null
    recordedQueries = []
    deletedIds = []
    tripsPool = [...MOCK_TRIPS]
    clearNuxtData(TRIPS_LIST_CACHE_KEY)
    useCompetencePeriod().setMonth('2026-09')
    useGlobalModals().closeModals()
    resetTripsFilterState()
  })

  it('deve renderizar estados de carregamento, erro com nova tentativa e estado vazio', async () => {
    listMode = 'error'
    const errorWrapper = await mountSuspended(TripsPage)
    await vi.waitFor(() => {
      expect(errorWrapper.find('[data-testid="trips-error-state"]').exists()).toBe(true)
    })

    listMode = 'ok'
    await errorWrapper.find('[data-testid="trips-retry-btn"]').trigger('click')
    await vi.waitFor(() => {
      expect(errorWrapper.find('[data-testid="trips-data-table"]').exists()).toBe(true)
    })

    clearNuxtData(TRIPS_LIST_CACHE_KEY)
    listMode = 'empty'
    const emptyWrapper = await mountSuspended(TripsPage)
    await vi.waitFor(() => {
      expect(emptyWrapper.find('[data-testid="trips-empty-state"]').exists()).toBe(true)
    })

    clearNuxtData(TRIPS_LIST_CACHE_KEY)
    listMode = 'delayed'
    const loadingWrapper = await mountSuspended(TripsPage)
    expect(loadingWrapper.find('[data-testid="trips-loading-state"]').exists()).toBe(true)
    resolveDelayed?.()
    await flushPromises()
  })

  it('deve exibir tabela, filtrar por UF/período/busca, ordenar colunas, editar e excluir viagem', async () => {
    const wrapper = await mountSuspended(TripsPage)
    await vi.waitFor(() => {
      expect(wrapper.findAll('[data-testid="trip-row"]')).toHaveLength(2)
    })

    expect(wrapper.get('h1').text()).toBe('Viagens Registradas')
    expect(wrapper.find('[data-testid="trips-summary-footer"]').text()).toContain(
      'TOTAIS (2 VIAGENS EXIBIDAS)',
    )
    expect(wrapper.find('[data-testid="trips-summary-distance"]').text()).toBe('2.260 km')

    // Filtra por UF MT
    await wrapper.find('[data-testid="trips-state-filter-MT"]').trigger('click')
    await vi.waitFor(() => {
      expect(wrapper.findAll('[data-testid="trip-row"]')).toHaveLength(1)
    })
    expect(wrapper.text()).toContain('Santos, SP → Rondonópolis, MT')

    // Volta para TODOS e altera período
    await wrapper.find('[data-testid="trips-state-filter-TODOS"]').trigger('click')
    await wrapper.find('[data-testid="trips-period-select"]').setValue('last90days')
    await vi.waitFor(() => {
      expect(hasPeriodQuery('last90days')).toBe(true)
    })

    // Busca textual com debounce e estado vazio com botão Limpar filtros
    const searchInput = wrapper.find('[data-testid="trips-search-input"]')
    await searchInput.setValue('Cascavel')
    await vi.waitFor(() => {
      expect(wrapper.findAll('[data-testid="trip-row"]')).toHaveLength(1)
      expect(wrapper.text()).toContain('Cascavel, PR → Paranaguá, PR')
      expect(wrapper.find('[data-testid="trips-summary-footer"]').text()).toContain(
        'TOTAIS (1 VIAGEM EXIBIDA)',
      )
    })

    // Busca sem resultados ativa estado vazio com limpeza de filtros e CTA
    await searchInput.setValue('inexistente-xyz')
    await searchInput.trigger('keydown.enter')
    await vi.waitFor(() => {
      expect(wrapper.find('[data-testid="trips-empty-state"]').exists()).toBe(true)
    })
    await wrapper.find('[data-testid="trips-empty-new-btn"]').trigger('click')
    expect(useGlobalModals().isTripModalOpen.value).toBe(true)
    useGlobalModals().closeModals()

    await wrapper.find('[data-testid="trips-clear-filters-btn"]').trigger('click')
    await vi.waitFor(() => {
      expect(wrapper.findAll('[data-testid="trip-row"]')).toHaveLength(2)
    })

    // Ordenação em múltiplas colunas
    await wrapper.find('[data-testid="sort-route"]').trigger('click')
    await wrapper.find('[data-testid="sort-distanceKm"]').trigger('click')
    await wrapper.find('[data-testid="sort-costPerKm"]').trigger('click')
    await wrapper.find('[data-testid="sort-tripDate"]').trigger('click')
    await wrapper.find('[data-testid="sort-kmPerLiter"]').trigger('click')
    await vi.waitFor(() => {
      expect(hasSortQuery('kmPerLiter', 'desc')).toBe(true)
    })
    await wrapper.find('[data-testid="sort-kmPerLiter"]').trigger('click')
    await vi.waitFor(() => {
      expect(hasSortQuery('kmPerLiter', 'asc')).toBe(true)
    })

    // Clique em Editar abre modal global preenchido
    const firstRow = wrapper.findAll('[data-testid="trip-row"]')[0]
    await firstRow?.find('[data-testid="edit-trip-btn"]').trigger('click')
    expect(useGlobalModals().isTripModalOpen.value).toBe(true)
    expect(useTrips().editingTrip.value?.id).toBe(1)

    // Cancelar exclusão fecha modal sem chamar DELETE
    await firstRow?.find('[data-testid="delete-trip-btn"]').trigger('click')
    await flushPromises()
    const cancelDeleteBtn = document.body.querySelector(
      '[data-testid="cancel-delete-trip-btn"]',
    ) as HTMLButtonElement | null
    cancelDeleteBtn?.click()
    await flushPromises()
    expect(deletedIds).toEqual([])

    // Falha na exclusão mantém registro; sucesso remove da lista
    await firstRow?.find('[data-testid="delete-trip-btn"]').trigger('click')
    await flushPromises()
    failDelete = true
    const confirmBtn = document.body.querySelector(
      '[data-testid="confirm-delete-trip-btn"]',
    ) as HTMLButtonElement | null
    expect(confirmBtn).not.toBeNull()
    confirmBtn?.click()
    await flushPromises()
    expect(deletedIds).toEqual([])

    failDelete = false
    confirmBtn?.click()
    await vi.waitFor(() => {
      expect(deletedIds).toEqual([1])
      expect(wrapper.findAll('[data-testid="trip-row"]')).toHaveLength(1)
    })
  })
})
