<script setup lang="ts">
import { ref, useId } from 'vue'

const odometerStart = ref('784.320')
const fuelCost = ref('3.465,00')
const odometerError = ref('783.100')
const calculatedAverage = ref('2,41')
const cargoType = ref('Grãos / Granel Sólido (Soja/Milho)')
const operationDate = ref('2026-09-17')

const cargoSelectId = useId()
const operationDateId = useId()
</script>

<template>
  <section class="space-y-4">
    <h2 class="flex items-center gap-2 font-display text-xl tracking-wider text-white uppercase">
      <span class="inline-block size-3 bg-amber-default" aria-hidden="true" />
      <span>3. Componentes de Formulário &amp; Estados de Entrada</span>
    </h2>

    <div
      class="grid grid-cols-1 gap-6 rounded-lg border border-asphalt-border bg-asphalt-surface p-6 md:grid-cols-3"
    >
      <UiAppUnitInput
        id="ds-odometer-normal"
        v-model="odometerStart"
        label="Odômetro Inicial (Com Unidade)"
        suffix="km"
      >
        <template #hint>Estado Normal / Padrão</template>
      </UiAppUnitInput>

      <UiAppUnitInput
        id="ds-fuel-focused"
        v-model="fuelCost"
        label="Custo do Abastecimento (Focado)"
        prefix="R$"
        active
      >
        <template #hint>Estado :focus / Glow de Alta Atenção</template>
      </UiAppUnitInput>

      <UiAppUnitInput
        id="ds-odometer-error"
        v-model="odometerError"
        label="KM Final Menor que Inicial (Erro)"
        suffix="km"
        error="Erro: KM final não pode retroceder"
      />

      <label :for="cargoSelectId" class="block space-y-1.5">
        <span class="block font-mono text-xs text-highway-muted">Tipo de Carga (Select)</span>
        <select
          :id="cargoSelectId"
          v-model="cargoType"
          class="w-full rounded-sm border border-asphalt-border bg-asphalt-bg px-3 py-2 text-sm text-white outline-none focus:border-amber-default focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-default"
        >
          <option>Grãos / Granel Sólido (Soja/Milho)</option>
          <option>Carga Frigorificada / Perecível</option>
          <option>Carga Geral / Paletizada</option>
          <option>Contêiner Marítimo</option>
        </select>
      </label>

      <UiAppUnitInput
        id="ds-average-disabled"
        v-model="calculatedAverage"
        label="Cálculo Automático (Desabilitado)"
        suffix="km/L"
        disabled
      >
        <template #hint>Estado Disabled</template>
      </UiAppUnitInput>

      <label :for="operationDateId" class="block space-y-1.5">
        <span class="block font-mono text-xs text-highway-muted">Data da Operação (Date)</span>
        <input
          :id="operationDateId"
          v-model="operationDate"
          type="date"
          class="w-full rounded-sm border border-asphalt-border bg-asphalt-bg px-3 py-2 font-mono text-sm text-white outline-none focus:border-amber-default focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-default"
        />
      </label>
    </div>
  </section>
</template>
