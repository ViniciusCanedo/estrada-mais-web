<script setup lang="ts">
import AppSidebar from '../components/layout/AppSidebar.vue'
import AppTopBar from '../components/layout/AppTopBar.vue'
import AppRoadDivider from '../components/ui/AppRoadDivider.vue'
import { useGlobalModals } from '../composables/useGlobalModals'
import { useTelemetrySync } from '../composables/useTelemetrySync'

const isDev = import.meta.dev
const { isOnline, isHealthy, lastSyncLabel, tripsCount, expensesCount } = useTelemetrySync()
const { isTripModalOpen, isExpenseModalOpen, closeModals } = useGlobalModals()

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
const expenseModalUi = createModalUi('border-expense-blue/70', 'max-w-xl')

function handleLogout(): void {
  // Fluxo completo de encerramento de sessão será conectado na spec 03-autenticacao.
  closeModals()
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
