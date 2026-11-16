<script setup lang="ts">
import { computed } from 'vue'
import type { MonthlyTrendPoint } from '#shared/schemas/report.schema'
import { buildCostTrendChartGeometry } from '~/utils/dashboard'

const props = defineProps<{
  points: readonly MonthlyTrendPoint[]
  targetMaxCostPerKmReais: number
}>()

const geometry = computed(() =>
  buildCostTrendChartGeometry(props.points, props.targetMaxCostPerKmReais),
)
</script>

<template>
  <section
    data-testid="chart-cost-trend"
    class="rounded-lg border border-asphalt-border bg-asphalt-surface p-6"
  >
    <div class="mb-4 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h3 class="font-display text-lg tracking-wide text-white uppercase">
          Evolução do Custo por KM (Últimos 6 Meses)
        </h3>
        <p class="text-xs text-highway-muted">
          Composição mensal: Diesel, Pedágio e Oficina (Valores em R$/km)
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-4 font-mono text-xs">
        <div class="flex items-center gap-1.5">
          <span class="size-3 rounded-xs bg-amber-default" aria-hidden="true" />
          <span class="text-white">Diesel</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="size-3 rounded-xs bg-expense-blue" aria-hidden="true" />
          <span class="text-white">Pedágio</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="size-3 rounded-xs bg-asphalt-border-light" aria-hidden="true" />
          <span class="text-white">Manutenção/Outros</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="h-0.5 w-4 border-t-2 border-dashed border-white" aria-hidden="true" />
          <span class="text-white">Total R$/km</span>
        </div>
      </div>
    </div>

    <div class="relative h-64 w-full rounded-sm border border-asphalt-border bg-asphalt-bg/60 p-4">
      <svg
        data-testid="cost-trend-svg"
        class="size-full"
        viewBox="0 0 900 200"
        preserveAspectRatio="none"
        role="img"
        aria-label="Evolução do custo operacional por quilômetro nos últimos 6 meses"
      >
        <title>Evolução do Custo por KM nos últimos 6 meses</title>

        <g v-for="tick in geometry.gridTicks" :key="tick.label">
          <line
            x1="65"
            :y1="tick.y"
            x2="880"
            :y2="tick.y"
            stroke="#2d2d30"
            stroke-dasharray="4 4"
          />
          <text x="8" :y="tick.y + 4" fill="#6b7280" font-size="10" font-family="JetBrains Mono">
            {{ tick.label }}
          </text>
        </g>

        <line x1="65" y1="180" x2="880" y2="180" stroke="#3f3f46" />
        <line
          x1="65"
          :y1="geometry.targetLineY"
          x2="880"
          :y2="geometry.targetLineY"
          stroke="#ffb400"
          stroke-opacity="0.35"
          stroke-dasharray="6 4"
        />

        <g v-for="bar in geometry.bars" :key="bar.month" :data-testid="`trend-bar-${bar.month}`">
          <rect
            v-if="bar.maintHeight > 0"
            :x="bar.barX"
            :y="bar.maintY"
            :width="bar.barWidth"
            :height="bar.maintHeight"
            fill="#3f3f46"
            rx="2"
          />
          <rect
            v-if="bar.tollHeight > 0"
            :x="bar.barX"
            :y="bar.tollY"
            :width="bar.barWidth"
            :height="bar.tollHeight"
            fill="#7aa8ff"
            rx="2"
          />
          <rect
            v-if="bar.dieselHeight > 0"
            :x="bar.barX"
            :y="bar.dieselY"
            :width="bar.barWidth"
            :height="bar.dieselHeight"
            fill="#ffb400"
            rx="2"
            :stroke="bar.isCurrent ? '#ffffff' : 'none'"
            :stroke-width="bar.isCurrent ? '1.5' : '0'"
          />
          <text
            :x="bar.cx"
            y="195"
            text-anchor="middle"
            :fill="bar.isCurrent ? '#ffb400' : '#9ca3af'"
            :font-weight="bar.isCurrent ? 'bold' : 'normal'"
            font-size="11"
            font-family="JetBrains Mono"
          >
            {{ bar.label }}
          </text>
        </g>

        <polyline
          v-if="geometry.bars.length > 0"
          fill="none"
          stroke="#ffffff"
          stroke-width="2.5"
          stroke-linecap="round"
          :points="geometry.polylinePoints"
        />

        <g v-for="bar in geometry.bars" :key="`point-${bar.month}`">
          <circle
            :cx="bar.cx"
            :cy="bar.totalY"
            :r="bar.isCurrent ? 5 : 4"
            :fill="bar.markerColor"
            :stroke="bar.isCurrent ? '#141416' : 'none'"
            :stroke-width="bar.isCurrent ? '2' : '0'"
          />
          <text
            :x="bar.cx"
            :y="bar.valueLabelY"
            text-anchor="middle"
            :fill="bar.markerColor"
            :font-size="bar.isCurrent ? '11' : '10'"
            font-family="JetBrains Mono"
            :font-weight="bar.isCurrent ? 'bold' : 'normal'"
          >
            {{ bar.formattedTotal }}
          </text>
        </g>
      </svg>
    </div>
  </section>
</template>
