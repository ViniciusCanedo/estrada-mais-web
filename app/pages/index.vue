<script setup lang="ts">
import { computed } from 'vue'
import CostTrendSvgChart from '~/components/dashboard/CostTrendSvgChart.vue'
import HeroCostCard from '~/components/dashboard/HeroCostCard.vue'
import RecentExpensesTableCard from '~/components/dashboard/RecentExpensesTableCard.vue'
import RecentTripsTableCard from '~/components/dashboard/RecentTripsTableCard.vue'
import SecondaryStatsGrid from '~/components/dashboard/SecondaryStatsGrid.vue'
import { useCompetencePeriod } from '~/composables/useCompetencePeriod'
import { useDashboard } from '~/composables/useDashboard'
import { useGlobalModals } from '~/composables/useGlobalModals'

useHead({
  title: 'Painel Principal | Estrada+',
})

const { formattedMonthLabel } = useCompetencePeriod()
const { openTripModal, openExpenseModal } = useGlobalModals()
const { dashboard, pending, error, refresh } = useDashboard()

const isEmptyMonth = computed(() => {
  const current = dashboard.value
  if (!current) {
    return false
  }
  return (
    current.stats.kmDriven.totalKm === 0 &&
    current.recentTrips.length === 0 &&
    current.recentExpenses.length === 0
  )
})
</script>

<template>
  <div data-testid="screen-dashboard" class="space-y-6">
    <h1 class="sr-only">Painel Principal — {{ formattedMonthLabel }}</h1>

    <div
      v-if="pending && !dashboard"
      data-testid="dashboard-loading-state"
      class="rounded-lg border border-asphalt-border bg-asphalt-surface p-6 font-mono text-sm text-highway-muted"
    >
      Carregando telemetria e consolidação mensal de {{ formattedMonthLabel }}...
    </div>

    <UAlert
      v-else-if="error && !dashboard"
      color="error"
      variant="subtle"
      data-testid="dashboard-error-state"
      title="Não foi possível carregar o Painel Principal"
      description="Verifique sua sessão ou tente atualizar os indicadores do mês."
    >
      <template #actions>
        <UButton
          label="Tentar novamente"
          color="neutral"
          variant="outline"
          size="xs"
          data-testid="dashboard-retry-btn"
          @click="refresh()"
        />
      </template>
    </UAlert>

    <div
      v-else-if="!dashboard"
      data-testid="dashboard-unavailable-state"
      class="rounded-lg border border-asphalt-border bg-asphalt-surface p-6 font-mono text-sm text-highway-muted"
    >
      Nenhum dado operacional encontrado para {{ formattedMonthLabel }}.
    </div>

    <template v-else>
      <div class="grid grid-cols-12 items-stretch gap-6">
        <HeroCostCard :hero="dashboard.hero" />
        <SecondaryStatsGrid
          :stats="dashboard.stats"
          :previous-month-label="dashboard.hero.previousMonthLabel"
        />
      </div>

      <div
        v-if="isEmptyMonth"
        data-testid="dashboard-empty-state"
        class="flex flex-col items-start justify-between gap-4 rounded-lg border border-asphalt-border bg-asphalt-surface p-6 sm:flex-row sm:items-center"
      >
        <div class="space-y-1">
          <h2 class="font-display text-lg font-semibold text-white uppercase">
            Sem movimentação em {{ dashboard.monthLabel }}
          </h2>
          <p class="text-xs text-highway-muted">
            Registre sua primeira viagem ou lance uma despesa operacional para iniciar a
            consolidação desta competência.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <UButton
            label="+ Lançar Despesa"
            icon="i-lucide-plus"
            color="secondary"
            variant="outline"
            size="sm"
            data-testid="dashboard-empty-expense-btn"
            @click="openExpenseModal()"
          />
          <UButton
            label="+ Registrar Viagem"
            icon="i-lucide-plus"
            color="primary"
            size="sm"
            data-testid="dashboard-empty-trip-btn"
            @click="openTripModal()"
          />
        </div>
      </div>

      <CostTrendSvgChart
        :points="dashboard.trendSixMonths"
        :target-max-cost-per-km-reais="dashboard.hero.targetMaxCostPerKmReais"
      />

      <div
        v-if="!isEmptyMonth"
        data-testid="dashboard-tables"
        class="grid grid-cols-1 gap-6 lg:grid-cols-2"
      >
        <RecentTripsTableCard
          :trips="dashboard.recentTrips"
          :total-count="dashboard.recentTripsCount"
        />
        <RecentExpensesTableCard
          :expenses="dashboard.recentExpenses"
          :total-count="dashboard.recentExpensesCount"
        />
      </div>
    </template>
  </div>
</template>
