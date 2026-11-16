<script setup lang="ts">
import { computed, watch } from 'vue'
import type { ExpensePayloadInput } from '#shared/schemas/expense.schema'
import ExpenseFormModal from '../components/expenses/ExpenseFormModal.vue'
import AppSidebar from '../components/layout/AppSidebar.vue'
import AppTopBar from '../components/layout/AppTopBar.vue'
import AppRoadDivider from '../components/ui/AppRoadDivider.vue'
import { useAuthSession } from '../composables/useAuthSession'
import { useCompetencePeriod } from '../composables/useCompetencePeriod'
import { useExpenses } from '../composables/useExpenses'
import { useGlobalModals } from '../composables/useGlobalModals'
import { useTelemetrySync } from '../composables/useTelemetrySync'
import { resolveDefaultExpenseDate } from '../utils/expenses'

const isDev = import.meta.dev
const toast = useToast()
const { selectedMonth } = useCompetencePeriod()
const { isOnline, isHealthy, lastSyncLabel, tripsCount, expensesCount } = useTelemetrySync()
const { isTripModalOpen, isExpenseModalOpen, closeModals } = useGlobalModals()
const { user, logout } = useAuthSession()
const {
  editingExpense,
  mutating: savingExpense,
  mutationError: expenseModalError,
  createExpense,
  updateExpense,
  clearEditingExpense,
} = useExpenses({ autoFetch: false })

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

const tripModalUi = createModalUi('border-amber-default/70', 'max-w-2xl')
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

    <UModal
      v-model:open="isTripModalOpen"
      title="Registrar Nova Viagem"
      description="Telemetria de percurso, abastecimento e pesagem"
      :ui="tripModalUi"
    >
      <template #body>
        <div data-testid="modal-log-trip" class="space-y-4">
          <AppRoadDivider />
          <p class="font-mono text-xs text-highway-muted">
            Formulário completo de lançamento de viagem será conectado no módulo 05-viagens.
          </p>
        </div>
      </template>

      <template #footer="{ close }">
        <UButton label="Cancelar" color="neutral" variant="outline" @click="close" />
      </template>
    </UModal>

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
