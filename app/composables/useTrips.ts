import type { NuxtError } from '#app'
import { computed, getCurrentInstance, onServerPrefetch, type ComputedRef, type Ref } from 'vue'
import type {
  TripDto,
  TripListResponse,
  TripListSummaryDto,
  TripPayloadInput,
  TripPeriodOption,
  TripSortDirection,
  TripSortField,
} from '#shared/schemas/trip.schema'
import type { ApiItemResponse, ApiSuccessResponse } from '#shared/types/domain'
import { useApiFetch } from './useApiFetch'
import { useCompetencePeriod } from './useCompetencePeriod'
import { useGlobalModals } from './useGlobalModals'
import { useTelemetrySync } from './useTelemetrySync'

export const TRIPS_LIST_CACHE_KEY = 'trips-list'

const EMPTY_SUMMARY: TripListSummaryDto = {
  totalDistanceKm: 0,
  weightedAverageKmL: 0,
  totalFuelCostReais: 0,
  totalTollCostReais: 0,
  totalFreightValueReais: 0,
  weightedCostPerKmReais: 0,
}

export interface TripModalController {
  isTripModalOpen: Ref<boolean>
  editingTrip: Ref<TripDto | null>
  openCreateTripModal: () => void
  openEditTripModal: (trip: TripDto) => void
  closeTripModal: () => void
  createTrip: (payload: TripPayloadInput) => Promise<TripDto>
  updateTrip: (tripId: number, payload: TripPayloadInput) => Promise<TripDto>
  deleteTrip: (tripId: number) => Promise<void>
}

export interface TripsPageState extends TripModalController {
  trips: ComputedRef<TripDto[]>
  totalCount: ComputedRef<number>
  availableStates: ComputedRef<string[]>
  summary: ComputedRef<TripListSummaryDto>
  pending: ComputedRef<boolean>
  error: Ref<NuxtError<unknown> | undefined>
  period: Ref<TripPeriodOption>
  search: Ref<string>
  selectedState: Ref<string>
  sortBy: Ref<TripSortField>
  sortDir: Ref<TripSortDirection>
  refresh: () => Promise<void>
  toggleSort: (column: TripSortField) => void
  resetFilters: () => void
}

async function refreshTripsAndTelemetry(refreshSync: () => Promise<void>): Promise<void> {
  const tasks: Promise<unknown>[] = [refreshSync()]
  if (typeof refreshNuxtData === 'function') {
    tasks.push(refreshNuxtData(TRIPS_LIST_CACHE_KEY))
  }
  await Promise.all(tasks)
}

/**
 * Controla o estado compartilhado de abertura, edição e mutações do modal global de Viagens sem disparar fetch de listagem.
 */
export function useTripModalState(): TripModalController {
  const { isTripModalOpen, openTripModal, closeModals } = useGlobalModals()
  const { refreshSync } = useTelemetrySync()
  const editingTrip = useState<TripDto | null>('estrada-editing-trip', () => null)

  function openCreateTripModal(): void {
    editingTrip.value = null
    openTripModal()
  }

  function openEditTripModal(trip: TripDto): void {
    editingTrip.value = trip
    openTripModal()
  }

  function closeTripModal(): void {
    editingTrip.value = null
    closeModals()
  }

  async function createTrip(payload: TripPayloadInput): Promise<TripDto> {
    const response = await $fetch<ApiItemResponse<TripDto>>('/api/trips', {
      method: 'POST',
      body: payload,
    })
    await refreshTripsAndTelemetry(refreshSync)
    return response.data
  }

  async function updateTrip(tripId: number, payload: TripPayloadInput): Promise<TripDto> {
    const response = await $fetch<ApiItemResponse<TripDto>>(`/api/trips/${tripId}`, {
      method: 'PUT',
      body: payload,
    })
    await refreshTripsAndTelemetry(refreshSync)
    return response.data
  }

  async function deleteTrip(tripId: number): Promise<void> {
    await $fetch<ApiSuccessResponse>(`/api/trips/${tripId}`, {
      method: 'DELETE',
    })
    await refreshTripsAndTelemetry(refreshSync)
  }

  return {
    isTripModalOpen,
    editingTrip,
    openCreateTripModal,
    openEditTripModal,
    closeTripModal,
    createTrip,
    updateTrip,
    deleteTrip,
  }
}

function useTripsFilterRefs() {
  return {
    period: useState<TripPeriodOption>('estrada-trips-period', () => 'month'),
    search: useState<string>('estrada-trips-search', () => ''),
    selectedState: useState<string>('estrada-trips-state', () => 'TODOS'),
    sortBy: useState<TripSortField>('estrada-trips-sort-by', () => 'tripDate'),
    sortDir: useState<TripSortDirection>('estrada-trips-sort-dir', () => 'desc'),
  }
}

function buildTripsQueryParams(month: string, filters: ReturnType<typeof useTripsFilterRefs>) {
  const trimmedSearch = filters.search.value.trim()
  return {
    month,
    period: filters.period.value,
    ...(trimmedSearch.length > 0 ? { search: trimmedSearch } : {}),
    state: filters.selectedState.value,
    sortBy: filters.sortBy.value,
    sortDir: filters.sortDir.value,
  }
}

export function resetTripsFilterState(): void {
  const filters = useTripsFilterRefs()
  filters.period.value = 'month'
  filters.search.value = ''
  filters.selectedState.value = 'TODOS'
  filters.sortBy.value = 'tripDate'
  filters.sortDir.value = 'desc'
}

/**
 * Gerencia listagem SSR reativa, filtros, ordenação e mutações da página de Viagens.
 */
export function useTrips(): TripsPageState {
  const { selectedMonth } = useCompetencePeriod()
  const modalController = useTripModalState()
  const filters = useTripsFilterRefs()
  const queryParams = computed(() => buildTripsQueryParams(selectedMonth.value, filters))
  const tripsAsyncData = useApiFetch<TripListResponse>('/trips', {
    key: TRIPS_LIST_CACHE_KEY,
    query: queryParams,
  })

  if (getCurrentInstance()) {
    onServerPrefetch(async () => {
      await tripsAsyncData
    })
  }

  function toggleSort(column: TripSortField): void {
    if (filters.sortBy.value === column) {
      filters.sortDir.value = filters.sortDir.value === 'asc' ? 'desc' : 'asc'
      return
    }
    filters.sortBy.value = column
    filters.sortDir.value = column === 'route' ? 'asc' : 'desc'
  }

  function resetFilters(): void {
    filters.period.value = 'month'
    filters.search.value = ''
    filters.selectedState.value = 'TODOS'
    filters.sortBy.value = 'tripDate'
    filters.sortDir.value = 'desc'
  }

  return {
    ...modalController,
    trips: computed(() => tripsAsyncData.data.value?.data ?? []),
    totalCount: computed(() => tripsAsyncData.data.value?.meta.totalCount ?? 0),
    availableStates: computed(() => tripsAsyncData.data.value?.meta.availableStates ?? []),
    summary: computed(() => tripsAsyncData.data.value?.meta.summary ?? EMPTY_SUMMARY),
    pending: computed(() => tripsAsyncData.status.value === 'pending'),
    error: tripsAsyncData.error,
    ...filters,
    refresh: () => tripsAsyncData.refresh(),
    toggleSort,
    resetFilters,
  }
}
