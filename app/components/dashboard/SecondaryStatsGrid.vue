<script setup lang="ts">
import { computed } from 'vue'
import type { DashboardSummaryResponse } from '#shared/schemas/report.schema'
import { buildSecondaryStatCards } from '~/utils/dashboard'

const props = defineProps<{
  stats: DashboardSummaryResponse['stats']
  previousMonthLabel: string
}>()

const cards = computed(() => buildSecondaryStatCards(props.stats, props.previousMonthLabel))
</script>

<template>
  <div
    data-testid="secondary-stat-grid"
    class="col-span-12 grid grid-cols-2 gap-4 md:grid-cols-4 lg:col-span-8"
  >
    <article
      v-for="card in cards"
      :key="card.id"
      :data-testid="`stat-card-${card.id}`"
      class="flex flex-col justify-between rounded-lg border border-asphalt-border bg-asphalt-surface p-4 transition-colors hover:border-asphalt-border-light"
      :class="card.cardClass"
    >
      <div class="flex items-center justify-between gap-2 font-mono text-xs text-highway-muted">
        <span>{{ card.title }}</span>
        <UIcon v-if="card.icon" :name="card.icon" class="size-4" :class="card.iconClass" />
        <span v-else-if="card.topBadge" class="text-[10px]" :class="card.topBadgeClass">
          {{ card.topBadge }}
        </span>
      </div>

      <div class="my-2">
        <p class="font-mono text-2xl font-bold" :class="card.valueClass">
          {{ card.value }}
        </p>
        <p class="font-mono text-[11px] text-highway-muted">{{ card.subtitle }}</p>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-1 font-mono text-[10px]">
        <span :class="card.footerClass">{{ card.footer }}</span>
        <span v-if="card.targetText" :data-testid="card.targetTestId" class="text-highway-muted">
          {{ card.targetText }}
        </span>
      </div>
    </article>
  </div>
</template>
