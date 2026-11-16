<script setup lang="ts">
import { computed } from 'vue'
import type { DashboardSummaryResponse } from '#shared/schemas/report.schema'
import { toCents } from '#shared/utils/units'
import AppRoadDivider from '~/components/ui/AppRoadDivider.vue'
import { formatPercentPtBr } from '~/utils/dashboard'
import { formatCurrencyFromCents } from '~/utils/formatters'

const props = defineProps<{
  hero: DashboardSummaryResponse['hero']
}>()

const formattedCostPerKm = computed(() =>
  formatCurrencyFromCents(toCents(props.hero.costPerKmReais)),
)

const formattedTargetCost = computed(() =>
  formatCurrencyFromCents(toCents(props.hero.targetMaxCostPerKmReais)),
)

const hasComparison = computed(
  () => props.hero.deltaPercentVsPrevious !== null && props.hero.deltaReaisPerKmVsPrevious !== null,
)

const isEconomy = computed(() => (props.hero.deltaReaisPerKmVsPrevious ?? 0) <= 0)

const deltaPercentLabel = computed(() => {
  const value = props.hero.deltaPercentVsPrevious ?? 0
  const arrow = isEconomy.value ? '↓' : '↑'
  const prefix = value > 0 ? '+' : ''
  return `${arrow} ${prefix}${formatPercentPtBr(value)} vs ${props.hero.previousMonthLabel}`
})

const deltaNominalLabel = computed(() => {
  const absCents = Math.abs(toCents(props.hero.deltaReaisPerKmVsPrevious ?? 0))
  const prefix = isEconomy.value ? 'Economia de' : 'Aumento de'
  return `${prefix} ${formatCurrencyFromCents(absCents)}/km`
})
</script>

<template>
  <section
    data-testid="hero-cost-card"
    class="relative col-span-12 flex flex-col justify-between overflow-hidden rounded-lg border-2 border-amber-default/70 bg-asphalt-surface p-6 shadow-[0_4px_25px_rgba(0,0,0,0.6)] lg:col-span-4"
  >
    <div class="flex items-center justify-between gap-2">
      <span
        class="flex items-center gap-1.5 font-mono text-[11px] font-semibold tracking-widest text-amber-default uppercase"
      >
        <span class="inline-block size-2 rounded-full bg-amber-default" aria-hidden="true" />
        INDICADOR MESTRE
      </span>
      <span
        data-testid="dashboard-max-cost-badge"
        class="rounded-sm border border-asphalt-border bg-asphalt-bg px-2 py-0.5 font-mono text-[10px] text-highway-muted"
      >
        META: ≤ {{ formattedTargetCost }}
      </span>
    </div>

    <div class="my-6">
      <h2 class="mb-1 font-mono text-xs tracking-widest text-highway-muted uppercase">
        Custo Médio Operacional
      </h2>
      <div class="flex items-baseline gap-2">
        <span
          data-testid="hero-cost-per-km-value"
          class="font-mono text-5xl font-extrabold tracking-tight text-white"
        >
          {{ formattedCostPerKm }}
        </span>
        <span class="font-mono text-lg font-bold text-highway-muted">/ km</span>
      </div>

      <div
        v-if="hasComparison"
        data-testid="hero-delta-compare"
        class="mt-3 flex flex-wrap items-center gap-2"
      >
        <span
          class="inline-flex items-center rounded-sm border px-2 py-0.5 font-mono text-xs font-semibold"
          :class="
            isEconomy
              ? 'border-highway-green/30 bg-highway-green/10 text-highway-green'
              : 'border-highway-red/30 bg-highway-red/10 text-highway-red'
          "
        >
          {{ deltaPercentLabel }}
        </span>
        <span class="text-xs text-highway-muted">{{ deltaNominalLabel }}</span>
      </div>
      <div v-else data-testid="hero-delta-compare" class="mt-3">
        <span
          class="inline-flex items-center rounded-sm border border-asphalt-border bg-asphalt-bg px-2 py-0.5 font-mono text-xs text-highway-muted"
        >
          Sem comparativo vs {{ hero.previousMonthLabel }}
        </span>
      </div>
    </div>

    <div class="border-t border-asphalt-border pt-4">
      <div class="mb-1.5 flex justify-between font-mono text-[11px] text-highway-muted">
        <span>Combustível {{ hero.proportions.fuelPercent }}%</span>
        <span>Pedágio {{ hero.proportions.tollPercent }}%</span>
        <span>Manut. {{ hero.proportions.maintenanceOthersPercent }}%</span>
      </div>
      <div class="flex h-2 w-full overflow-hidden rounded-full bg-asphalt-bg">
        <div
          class="h-full bg-amber-default transition-all"
          :style="{ width: `${hero.proportions.fuelPercent}%` }"
          :title="`Combustível: ${hero.proportions.fuelPercent}%`"
        />
        <div
          class="h-full bg-expense-blue transition-all"
          :style="{ width: `${hero.proportions.tollPercent}%` }"
          :title="`Pedágios: ${hero.proportions.tollPercent}%`"
        />
        <div
          class="h-full bg-highway-muted transition-all"
          :style="{ width: `${hero.proportions.maintenanceOthersPercent}%` }"
          :title="`Manutenção/Outros: ${hero.proportions.maintenanceOthersPercent}%`"
        />
      </div>
    </div>

    <AppRoadDivider class="absolute inset-x-0 bottom-0" />
  </section>
</template>
