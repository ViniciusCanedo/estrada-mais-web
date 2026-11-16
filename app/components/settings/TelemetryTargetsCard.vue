<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { computed, reactive, useId, watch } from 'vue'
import {
  MAX_COST_PER_KM_MAX_REAIS,
  MAX_COST_PER_KM_MIN_REAIS,
  MAX_COST_PER_KM_STEP_REAIS,
  TARGET_CONSUMPTION_MAX_KML,
  TARGET_CONSUMPTION_MIN_KML,
  TARGET_CONSUMPTION_STEP_KML,
  updateTelemetryTargetsSchema,
  type UpdateTelemetryTargetsInput,
} from '#shared/schemas/settings.schema'
import { toCents, toMilliKmL } from '#shared/utils/units'
import { formatCurrencyFromCents, formatKmPerLiterFromMilli } from '~/utils/formatters'

const props = withDefaults(
  defineProps<{
    targetConsumptionKmL: number
    maxCostPerKmReais: number
    saving?: boolean
    errorMessage?: string | null
  }>(),
  {
    saving: false,
    errorMessage: null,
  },
)

const emit = defineEmits<{
  submit: [payload: UpdateTelemetryTargetsInput]
}>()

const consumptionSliderId = useId()
const costSliderId = useId()

const formState = reactive<UpdateTelemetryTargetsInput>({
  targetConsumptionKmL: props.targetConsumptionKmL,
  maxCostPerKmReais: props.maxCostPerKmReais,
})

watch(
  () => [props.targetConsumptionKmL, props.maxCostPerKmReais] as const,
  ([nextConsumption, nextMaxCost]) => {
    formState.targetConsumptionKmL = nextConsumption
    formState.maxCostPerKmReais = nextMaxCost
  },
)

const formattedConsumption = computed(() =>
  formatKmPerLiterFromMilli(toMilliKmL(formState.targetConsumptionKmL)),
)
const formattedMaxCost = computed(
  () => `${formatCurrencyFromCents(toCents(formState.maxCostPerKmReais))} / km`,
)

function handleSubmit(event: FormSubmitEvent<UpdateTelemetryTargetsInput>): void {
  emit('submit', event.data)
}
</script>

<template>
  <section
    data-testid="settings-targets-card"
    class="space-y-4 rounded-lg border border-asphalt-border bg-asphalt-surface p-6"
  >
    <h2 class="font-display text-lg tracking-wide text-white uppercase">Metas de Telemetria</h2>

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="subtle"
      data-testid="settings-targets-error"
      :title="errorMessage"
    />

    <UForm
      :schema="updateTelemetryTargetsSchema"
      :state="formState"
      class="space-y-4"
      @submit="handleSubmit"
    >
      <UFormField name="targetConsumptionKmL">
        <label :for="consumptionSliderId" class="block space-y-1">
          <span class="flex justify-between font-mono text-xs">
            <span class="text-highway-muted">Meta Consumo (km/L)</span>
            <span
              data-testid="settings-target-consumption-value"
              class="font-bold text-amber-default"
            >
              {{ formattedConsumption }}
            </span>
          </span>
          <input
            :id="consumptionSliderId"
            v-model.number="formState.targetConsumptionKmL"
            type="range"
            :min="TARGET_CONSUMPTION_MIN_KML"
            :max="TARGET_CONSUMPTION_MAX_KML"
            :step="TARGET_CONSUMPTION_STEP_KML"
            data-testid="settings-target-consumption-slider"
            class="w-full cursor-pointer accent-amber-default"
          />
        </label>
      </UFormField>

      <UFormField name="maxCostPerKmReais">
        <label :for="costSliderId" class="block space-y-1">
          <span class="flex justify-between font-mono text-xs">
            <span class="text-highway-muted">Teto de Custo Operacional</span>
            <span data-testid="settings-max-cost-value" class="font-bold text-white">
              {{ formattedMaxCost }}
            </span>
          </span>
          <input
            :id="costSliderId"
            v-model.number="formState.maxCostPerKmReais"
            type="range"
            :min="MAX_COST_PER_KM_MIN_REAIS"
            :max="MAX_COST_PER_KM_MAX_REAIS"
            :step="MAX_COST_PER_KM_STEP_REAIS"
            data-testid="settings-max-cost-slider"
            class="w-full cursor-pointer accent-amber-default"
          />
        </label>
      </UFormField>

      <div class="border-t border-asphalt-border pt-3">
        <UButton
          type="submit"
          block
          color="primary"
          variant="outline"
          :loading="saving"
          label="Salvar Metas Operacionais"
          data-testid="settings-save-targets-btn"
          class="font-mono text-xs"
        />
      </div>
    </UForm>
  </section>
</template>
