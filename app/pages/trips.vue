<script setup lang="ts">
import { computed, ref } from 'vue'
import type { TripDto } from '#shared/schemas/trip.schema'
import TripDeleteModal from '~/components/trips/TripDeleteModal.vue'
import TripsDataTable from '~/components/trips/TripsDataTable.vue'
import TripsFilterBar from '~/components/trips/TripsFilterBar.vue'
import { extractAuthErrorMessage } from '~/composables/useAuthSession'
import { useCompetencePeriod } from '~/composables/useCompetencePeriod'
import { useTrips } from '~/composables/useTrips'

useHead({
  title: 'Viagens | Estrada+',
})

const toast = useToast()
const { formattedMonthLabel } = useCompetencePeriod()
const {
  trips,
  availableStates,
  summary,
  pending,
  error,
  period,
  search,
  selectedState,
  sortBy,
  sortDir,
  refresh,
  toggleSort,
  resetFilters,
  openCreateTripModal,
  openEditTripModal,
  deleteTrip,
} = useTrips()

const tripPendingDelete = ref<TripDto | null>(null)
const deletingTrip = ref(false)

const isDeleteModalOpen = computed({
  get: () => tripPendingDelete.value !== null,
  set: (isOpen: boolean) => {
    if (!isOpen) {
      tripPendingDelete.value = null
    }
  },
})

const hasActiveFilter = computed(
  () =>
    search.value.trim().length > 0 || selectedState.value !== 'TODOS' || period.value !== 'month',
)

function requestDeleteTrip(trip: TripDto): void {
  tripPendingDelete.value = trip
}

async function confirmDeleteTrip(): Promise<void> {
  const target = tripPendingDelete.value
  if (!target) {
    return
  }

  deletingTrip.value = true
  try {
    await deleteTrip(target.id)
    tripPendingDelete.value = null
    toast.add({
      title: 'Viagem excluída com sucesso.',
      color: 'success',
      icon: 'i-lucide-check-circle-2',
    })
  } catch (caught: unknown) {
    toast.add({
      title: extractAuthErrorMessage(caught, 'Não foi possível excluir a viagem.'),
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  } finally {
    deletingTrip.value = false
  }
}
</script>

<template>
  <div data-testid="screen-trips" class="space-y-6">
    <div class="border-b border-asphalt-border pb-4">
      <span class="font-mono text-xs tracking-widest text-amber-default uppercase">
        HISTÓRICO DE VIAGENS &amp; TELEMETRIA • {{ formattedMonthLabel }}
      </span>
      <h1 class="mt-1 font-display text-3xl font-bold text-white uppercase">Viagens Registradas</h1>
      <p class="mt-1 text-sm text-highway-muted">
        Acompanhe rotas, odômetros, consumo médio em km/L, fretes e custos operacionais por km.
      </p>
    </div>

    <TripsFilterBar
      v-model:search="search"
      v-model:period="period"
      v-model:selected-state="selectedState"
      :available-states="availableStates"
      @create="openCreateTripModal()"
    />

    <div
      v-if="pending && trips.length === 0"
      data-testid="trips-loading-state"
      class="rounded-lg border border-asphalt-border bg-asphalt-surface p-6 font-mono text-sm text-highway-muted"
    >
      Carregando viagens registradas...
    </div>

    <UAlert
      v-else-if="error && trips.length === 0"
      color="error"
      variant="subtle"
      data-testid="trips-error-state"
      title="Não foi possível carregar as viagens"
      description="Verifique sua sessão ou tente atualizar os dados novamente."
    >
      <template #actions>
        <UButton
          label="Tentar novamente"
          color="neutral"
          variant="outline"
          size="xs"
          data-testid="trips-retry-btn"
          @click="refresh()"
        />
      </template>
    </UAlert>

    <div
      v-else-if="trips.length === 0"
      data-testid="trips-empty-state"
      class="flex flex-col items-start justify-between gap-4 rounded-lg border border-asphalt-border bg-asphalt-surface p-6 sm:flex-row sm:items-center"
    >
      <div class="space-y-1">
        <p class="font-display text-base font-semibold text-white uppercase">
          Nenhuma viagem encontrada para os filtros atuais
        </p>
        <p class="font-mono text-xs text-highway-muted">
          Ajuste o período/UF selecionados ou registre uma nova viagem no painel.
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <UButton
          v-if="hasActiveFilter"
          label="Limpar filtros"
          color="neutral"
          variant="outline"
          size="sm"
          data-testid="trips-clear-filters-btn"
          @click="resetFilters()"
        />
        <UButton
          label="+ Nova Viagem"
          color="primary"
          size="sm"
          data-testid="trips-empty-new-btn"
          @click="openCreateTripModal()"
        />
      </div>
    </div>

    <TripsDataTable
      v-else
      :trips="trips"
      :summary="summary"
      :sort-by="sortBy"
      :sort-dir="sortDir"
      @sort="toggleSort"
      @edit="openEditTripModal"
      @delete="requestDeleteTrip"
    />

    <TripDeleteModal
      v-model:open="isDeleteModalOpen"
      :trip="tripPendingDelete"
      :deleting="deletingTrip"
      @confirm="confirmDeleteTrip()"
      @cancel="tripPendingDelete = null"
    />
  </div>
</template>
