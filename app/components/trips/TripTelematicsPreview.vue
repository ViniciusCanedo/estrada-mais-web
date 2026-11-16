<script setup lang="ts">
import { computed } from 'vue'
import { calculateTripTelematics } from '#shared/utils/telematics'
import { toMilliKmL } from '#shared/utils/units'
import { formatKm, formatKmPerLiterFromMilli } from '~/utils/formatters'

const props = defineProps<{
  kmStart: number | undefined
  kmEnd: number | undefined
  fuelLiters: number | undefined
  fuelCostReais: number | undefined
  tollCostReais: number | undefined
}>()

const hasOdometers = computed(
  () =>
    typeof props.kmStart === 'number' &&
    Number.isFinite(props.kmStart) &&
    typeof props.kmEnd === 'number' &&
    Number.isFinite(props.kmEnd),
)

const telematics = computed(() =>
  calculateTripTelematics({
    kmStart: props.kmStart ?? 0,
    kmEnd: props.kmEnd ?? 0,
    fuelLiters: props.fuelLiters ?? 0,
    fuelCostReais: props.fuelCostReais ?? 0,
    tollCostReais: props.tollCostReais ?? 0,
  }),
)

const isInvalidOdometer = computed(() => hasOdometers.value && !telematics.value.isValidDistance)

const distanceLabel = computed(() => {
  if (!hasOdometers.value) {
    return '-- km'
  }
  if (!telematics.value.isValidDistance) {
    return 'Inválido (End ≤ Start)'
  }
  return formatKm(telematics.value.distanceKm)
})

const efficiencyLabel = computed(() => {
  if (!telematics.value.isValidDistance || telematics.value.kmPerLiter <= 0) {
    return '-- km/L'
  }
  return formatKmPerLiterFromMilli(toMilliKmL(telematics.value.kmPerLiter))
})

const distanceColorClass = computed(() => {
  if (isInvalidOdometer.value) {
    return 'text-highway-red'
  }
  return hasOdometers.value ? 'text-white' : 'text-highway-muted'
})
</script>

<template>
  <div class="grid grid-cols-1 gap-3 border-t border-asphalt-border/60 pt-2 sm:grid-cols-2">
    <div
      class="flex items-center justify-between rounded-sm border border-asphalt-border bg-asphalt-surface p-2.5"
    >
      <span class="font-mono text-xs text-highway-muted">KM Rodados (Distância):</span>
      <span
        data-testid="trip-live-distance"
        class="font-mono text-base font-bold"
        :class="distanceColorClass"
      >
        {{ distanceLabel }}
      </span>
    </div>

    <div
      class="flex items-center justify-between rounded-sm border border-amber-default/40 bg-asphalt-surface p-2.5"
    >
      <span class="font-mono text-xs text-highway-muted">Consumo Médio:</span>
      <span
        data-testid="trip-live-efficiency"
        class="font-mono text-base font-bold text-amber-default"
      >
        {{ efficiencyLabel }}
      </span>
    </div>
  </div>
</template>
