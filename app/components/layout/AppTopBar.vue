<script setup lang="ts">
import { computed } from 'vue'
import { useCompetencePeriod } from '~/composables/useCompetencePeriod'
import { useGlobalModals } from '~/composables/useGlobalModals'

const ROUTE_BREADCRUMBS: Record<string, string> = {
  '/': 'PAINEL PRINCIPAL',
  '/trips': 'VIAGENS (HISTÓRICO COMPLETO)',
  '/expenses': 'DESPESAS OPERACIONAIS',
  '/design-system': 'SISTEMA DE DESIGN & COMPONENTES',
  '/settings': 'CONFIGURAÇÕES',
}

const route = useRoute()
const { formattedMonthLabel, previousMonth, nextMonth } = useCompetencePeriod()
const { openTripModal, openExpenseModal } = useGlobalModals()

const breadcrumbTitle = computed(() => ROUTE_BREADCRUMBS[route.path] ?? 'ESTRADA+')
</script>

<template>
  <header
    data-testid="top-bar"
    class="sticky top-0 z-10 flex items-center justify-between border-b border-asphalt-border bg-asphalt-surface/95 px-8 py-3.5 backdrop-blur-sm"
  >
    <div class="flex items-center gap-3">
      <span
        data-testid="top-bar-breadcrumb"
        class="font-display text-xl font-bold tracking-wide text-white uppercase"
      >
        {{ breadcrumbTitle }}
      </span>
      <span class="text-asphalt-border-light" aria-hidden="true">/</span>

      <div
        class="flex items-center rounded-sm border border-asphalt-border bg-asphalt-bg px-2.5 py-1 text-xs"
      >
        <button
          type="button"
          aria-label="Mês anterior"
          title="Mês anterior"
          data-testid="prev-month-btn"
          class="px-1 font-mono text-highway-muted transition-colors hover:text-white"
          @click="previousMonth()"
        >
          &larr;
        </button>
        <span data-testid="active-competence-label" class="mx-2 font-mono font-semibold text-white">
          {{ formattedMonthLabel }}
        </span>
        <button
          type="button"
          aria-label="Próximo mês"
          title="Próximo mês"
          data-testid="next-month-btn"
          class="px-1 font-mono text-highway-muted transition-colors hover:text-white"
          @click="nextMonth()"
        >
          &rarr;
        </button>
      </div>
    </div>

    <div class="flex items-center gap-3" data-testid="top-actions">
      <button
        type="button"
        data-testid="open-expense-modal-btn"
        class="flex items-center gap-2 rounded-sm border border-expense-blue px-3.5 py-2 text-xs font-semibold tracking-wider text-expense-blue uppercase transition-all hover:bg-expense-blue/10 active:bg-expense-blue/20"
        @click="openExpenseModal()"
      >
        <UIcon name="i-lucide-plus" class="size-3.5 text-expense-blue" />
        <span>+ Lançar Despesa</span>
      </button>

      <button
        type="button"
        data-testid="open-trip-modal-btn"
        class="flex items-center gap-2 rounded-sm bg-amber-default px-4 py-2 font-display text-xs font-semibold tracking-wider text-asphalt-bg uppercase shadow-[0_0_15px_rgba(255,180,0,0.3)] transition-all hover:bg-amber-hover active:bg-amber-dark"
        @click="openTripModal()"
      >
        <UIcon name="i-lucide-plus" class="size-3.5 text-asphalt-bg" />
        <span>+ Registrar Viagem</span>
      </button>
    </div>
  </header>
</template>
