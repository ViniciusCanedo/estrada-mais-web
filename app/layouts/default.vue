<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ExpensePayloadInput } from '#shared/schemas/expense.schema'
import type { TripPayloadInput } from '#shared/schemas/trip.schema'
import ExpenseFormModal from '../components/expenses/ExpenseFormModal.vue'
import AppSidebar from '../components/layout/AppSidebar.vue'
import AppTopBar from '../components/layout/AppTopBar.vue'
import TripFormModal from '../components/trips/TripFormModal.vue'
import { extractAuthErrorMessage, useAuthSession } from '../composables/useAuthSession'
import { useCompetencePeriod } from '../composables/useCompetencePeriod'
import { useExpenses } from '../composables/useExpenses'
import { useGlobalModals } from '../composables/useGlobalModals'
import { useTelemetrySync } from '../composables/useTelemetrySync'
import { useTripModalState } from '../composables/useTrips'
import { resolveDefaultExpenseDate } from '../utils/expenses'

const isDev = import.meta.dev
const toast = useToast()
const { selectedMonth } = useCompetencePeriod()
const { isOnline, isHealthy, lastSyncLabel, tripsCount, expensesCount } = useTelemetrySync()
const { isTripModalOpen, isExpenseModalOpen, closeModals } = useGlobalModals()
const { editingTrip, closeTripModal, createTrip, updateTrip } = useTripModalState()
const { user, logout } = useAuthSession()
const {
  editingExpense,
  mutating: savingExpense,
  mutationError: expenseModalError,
  createExpense,
  updateExpense,
  clearEditingExpense,
} = useExpenses({ autoFetch: false })

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

const defaultExpenseDate = computed(() => resolveDefaultExpenseDate(selectedMonth.value))

watch(isExpenseModalOpen, (isOpen) => {
  if (!isOpen) {
    clearEditingExpense()
  }
})

async function handleExpenseSubmit(payload: ExpensePayloadInput): Promise<void> {
  const target = editingExpense.value
  try {
    if (target) {
      await updateExpense(target.id, payload)
      toast.add({
        title: 'Despesa atualizada com sucesso.',
        color: 'success',
        icon: 'i-lucide-check-circle-2',
      })
    } else {
      await createExpense(payload)
      toast.add({
        title: 'Despesa lançada com sucesso.',
        color: 'success',
        icon: 'i-lucide-check-circle-2',
      })
    }
    closeModals()
  } catch {
    // A mensagem de erro já é exposta em expenseModalError dentro do modal.
  }
}

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

    <ExpenseFormModal
      v-model:open="isExpenseModalOpen"
      :editing-expense="editingExpense"
      :default-date="defaultExpenseDate"
      :saving="savingExpense"
      :error-message="expenseModalError"
      @submit="handleExpenseSubmit"
    />
  </div>
</template>
