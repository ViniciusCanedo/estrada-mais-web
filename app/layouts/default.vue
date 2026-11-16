<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { TripPayloadInput } from '#shared/schemas/trip.schema'
import AppSidebar from '../components/layout/AppSidebar.vue'
import AppTopBar from '../components/layout/AppTopBar.vue'
import TripFormModal from '../components/trips/TripFormModal.vue'
import AppRoadDivider from '../components/ui/AppRoadDivider.vue'
import { extractAuthErrorMessage, useAuthSession } from '../composables/useAuthSession'
import { useCompetencePeriod } from '../composables/useCompetencePeriod'
import { useGlobalModals } from '../composables/useGlobalModals'
import { useTelemetrySync } from '../composables/useTelemetrySync'
import { useTripModalState } from '../composables/useTrips'

const isDev = import.meta.dev
const toast = useToast()
const { selectedMonth } = useCompetencePeriod()
const { isOnline, isHealthy, lastSyncLabel, tripsCount, expensesCount } = useTelemetrySync()
const { isTripModalOpen, isExpenseModalOpen, closeModals } = useGlobalModals()
const { editingTrip, closeTripModal, createTrip, updateTrip } = useTripModalState()
const { user, logout } = useAuthSession()

const savingTrip = ref(false)
const tripModalError = ref<string | null>(null)

watch(isTripModalOpen, (isOpen) => {
  if (!isOpen) {
    editingTrip.value = null
    tripModalError.value = null
  }
})

const driverProfile = computed(() =>
  user.value
    ? {
        name: user.value.name,
        vehicleSummary: user.value.vehicleSummary,
        initials: user.value.initials,
      }
    : {
        name: 'Motorista',
        vehicleSummary: 'Frota TAC',
        initials: 'MT',
      },
)

function createModalUi(borderClass: string, maxWidthClass: string) {
  return {
    overlay: 'bg-black/80 backdrop-blur-xs',
    content: `border-2 ${borderClass} bg-asphalt-surface ${maxWidthClass} divide-y divide-asphalt-border`,
    header: 'bg-asphalt-bg px-6 py-4',
    title: 'font-display text-lg font-bold tracking-wide text-white uppercase',
    description: 'font-mono text-xs text-highway-muted',
    body: 'p-6',
    footer: 'justify-end gap-3 px-6 py-4',
  }
}

const expenseModalUi = createModalUi('border-expense-blue/70', 'max-w-xl')

async function handleTripSubmit(payload: TripPayloadInput): Promise<void> {
  savingTrip.value = true
  tripModalError.value = null
  const currentEditing = editingTrip.value

  try {
    if (currentEditing) {
      await updateTrip(currentEditing.id, payload)
      toast.add({
        title: 'Viagem atualizada com sucesso.',
        color: 'success',
        icon: 'i-lucide-check-circle-2',
      })
    } else {
      await createTrip(payload)
      toast.add({
        title: 'Viagem registrada com sucesso.',
        color: 'success',
        icon: 'i-lucide-check-circle-2',
      })
    }
    closeTripModal()
  } catch (caught: unknown) {
    tripModalError.value = extractAuthErrorMessage(caught, 'Não foi possível salvar a viagem.')
  } finally {
    savingTrip.value = false
  }
}

async function handleLogout(): Promise<void> {
  closeModals()
  await logout()
  await navigateTo('/login', { replace: true })
}
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-asphalt-bg text-highway-fg">
    <AppSidebar
      :trips-count="tripsCount"
      :expenses-count="expensesCount"
      :is-online="isOnline"
      :is-healthy="isHealthy"
      :last-sync-label="lastSyncLabel"
      :is-dev="isDev"
      :driver="driverProfile"
      @logout="handleLogout"
    />

    <div class="flex h-screen flex-1 flex-col overflow-y-auto bg-asphalt-bg">
      <AppTopBar />
      <main class="flex-1 space-y-8 p-8">
        <slot />
      </main>
    </div>

    <TripFormModal
      v-model:open="isTripModalOpen"
      :editing-trip="editingTrip"
      :default-month="selectedMonth"
      :saving="savingTrip"
      :error-message="tripModalError"
      @submit="handleTripSubmit"
      @close="closeTripModal()"
    />

    <UModal
      v-model:open="isExpenseModalOpen"
      title="Lançar Nova Despesa"
      description="Registro contábil de combustível, oficina e diárias"
      :ui="expenseModalUi"
    >
      <template #body>
        <div data-testid="modal-log-expense" class="space-y-4">
          <AppRoadDivider subtle />
          <p class="font-mono text-xs text-highway-muted">
            Formulário completo do diário contábil será conectado no módulo 06-despesas.
          </p>
        </div>
      </template>

      <template #footer="{ close }">
        <UButton label="Cancelar" color="neutral" variant="outline" @click="close" />
      </template>
    </UModal>
  </div>
</template>
