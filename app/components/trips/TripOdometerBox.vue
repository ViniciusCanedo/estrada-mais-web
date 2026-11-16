<script setup lang="ts">
import TripTelematicsPreview from './TripTelematicsPreview.vue'

const kmStart = defineModel<number | undefined>('kmStart')
const kmEnd = defineModel<number | undefined>('kmEnd')
const fuelLiters = defineModel<number | undefined>('fuelLiters')
const fuelCostReais = defineModel<number | undefined>('fuelCostReais')

defineProps<{
  tollCostReais: number | undefined
}>()

function parseNumberField(raw: string | number | undefined): number | undefined {
  if (raw === '' || raw === undefined) {
    return undefined
  }
  const parsed = typeof raw === 'number' ? raw : Number(raw)
  return Number.isFinite(parsed) ? parsed : undefined
}
</script>

<template>
  <div class="space-y-3 rounded-lg border border-asphalt-border bg-asphalt-bg p-3">
    <div
      class="flex items-center gap-1.5 font-mono text-[11px] font-semibold tracking-wider text-amber-default uppercase"
    >
      <span class="size-1.5 rounded-full bg-amber-default" aria-hidden="true" />
      <span>Leitura de Odômetro &amp; Abastecimento (Cálculo em Tempo Real)</span>
    </div>

    <div class="grid grid-cols-1 gap-3 md:grid-cols-4">
      <UFormField label="KM Inicial *" name="kmStart">
        <UInput
          :model-value="kmStart ?? ''"
          type="number"
          step="1"
          placeholder="784320"
          class="w-full font-mono"
          data-testid="trip-km-start-input"
          @update:model-value="kmStart = parseNumberField($event)"
        />
      </UFormField>

      <UFormField label="KM Final *" name="kmEnd">
        <UInput
          :model-value="kmEnd ?? ''"
          type="number"
          step="1"
          placeholder="786060"
          class="w-full font-mono"
          data-testid="trip-km-end-input"
          @update:model-value="kmEnd = parseNumberField($event)"
        />
      </UFormField>

      <UFormField label="Diesel (Litros) *" name="fuelLiters">
        <UInput
          :model-value="fuelLiters ?? ''"
          type="number"
          step="0.1"
          placeholder="722.0"
          class="w-full font-mono"
          data-testid="trip-fuel-liters-input"
          @update:model-value="fuelLiters = parseNumberField($event)"
        />
      </UFormField>

      <UFormField label="Custo Total Diesel *" name="fuelCostReais">
        <UInput
          :model-value="fuelCostReais ?? ''"
          type="number"
          step="0.01"
          placeholder="3465.00"
          class="w-full font-mono"
          data-testid="trip-fuel-cost-input"
          @update:model-value="fuelCostReais = parseNumberField($event)"
        />
      </UFormField>
    </div>

    <TripTelematicsPreview
      :km-start="kmStart"
      :km-end="kmEnd"
      :fuel-liters="fuelLiters"
      :fuel-cost-reais="fuelCostReais"
      :toll-cost-reais="tollCostReais"
    />
  </div>
</template>
