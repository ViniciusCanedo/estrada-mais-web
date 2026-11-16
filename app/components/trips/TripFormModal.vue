<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { computed, reactive, watch } from 'vue'
import { tripPayloadSchema, type TripDto, type TripPayloadInput } from '#shared/schemas/trip.schema'
import AppRoadDivider from '../ui/AppRoadDivider.vue'
import AppUnitInput from '../ui/AppUnitInput.vue'
import TripOdometerBox from './TripOdometerBox.vue'

interface TripFormDraft {
  tripDate: string
  invoiceNumber: string
  origin: string
  destination: string
  freightValueReais: number | undefined
  cargoWeightTons: number | undefined
  tollCostReais: number | undefined
  kmStart: number | undefined
  kmEnd: number | undefined
  fuelLiters: number | undefined
  fuelCostReais: number | undefined
}

const open = defineModel<boolean>('open', { default: false })

const props = withDefaults(
  defineProps<{
    editingTrip?: TripDto | null
    defaultMonth?: string
    saving?: boolean
    errorMessage?: string | null
    portal?: boolean
  }>(),
  {
    editingTrip: null,
    defaultMonth: '2026-09',
    saving: false,
    errorMessage: null,
    portal: true,
  },
)

const emit = defineEmits<{
  submit: [payload: TripPayloadInput]
  close: []
}>()

const tripModalUi = {
  overlay: 'bg-black/80 backdrop-blur-xs',
  content:
    'border-2 border-amber-default/70 bg-asphalt-surface max-w-2xl divide-y divide-asphalt-border',
  header: 'bg-asphalt-bg px-6 py-4',
  title: 'font-display text-lg font-bold tracking-wide text-white uppercase',
  description: 'font-mono text-xs text-highway-muted',
  body: 'p-6',
}

function buildInitialDraft(trip: TripDto | null, month: string): TripFormDraft {
  if (trip) {
    return {
      tripDate: trip.tripDate,
      invoiceNumber: trip.invoiceNumber ?? '',
      origin: trip.origin,
      destination: trip.destination,
      freightValueReais: trip.freightValueReais,
      cargoWeightTons: trip.cargoWeightTons ?? undefined,
      tollCostReais: trip.tollCostReais,
      kmStart: trip.kmStart,
      kmEnd: trip.kmEnd,
      fuelLiters: trip.fuelLiters,
      fuelCostReais: trip.fuelCostReais,
    }
  }
  const defaultDay = month === '2026-09' ? '17' : '01'
  return {
    tripDate: `${month}-${defaultDay}`,
    invoiceNumber: '',
    origin: '',
    destination: '',
    freightValueReais: 0,
    cargoWeightTons: undefined,
    tollCostReais: 0,
    kmStart: undefined,
    kmEnd: undefined,
    fuelLiters: undefined,
    fuelCostReais: undefined,
  }
}

const formState = reactive<TripFormDraft>(buildInitialDraft(props.editingTrip, props.defaultMonth))

watch(
  () => [open.value, props.editingTrip, props.defaultMonth] as const,
  ([isOpen, nextTrip, nextMonth]) => {
    if (isOpen) {
      Object.assign(formState, buildInitialDraft(nextTrip, nextMonth))
    }
  },
)

const isEditing = computed(() => props.editingTrip !== null)
const modalTitle = computed(() => (isEditing.value ? 'Editar Viagem' : 'Registrar Nova Viagem'))

function parseNumberField(
  raw: string | number | undefined,
  defaultZero = false,
): number | undefined {
  if (raw === '' || raw === undefined) {
    return defaultZero ? 0 : undefined
  }
  const parsed = typeof raw === 'number' ? raw : Number(raw)
  if (Number.isFinite(parsed)) {
    return parsed
  }
  return defaultZero ? 0 : undefined
}

function handleSubmit(event: FormSubmitEvent<TripPayloadInput>): void {
  emit('submit', event.data)
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="modalTitle"
    description="Telemetria de percurso, abastecimento e pesagem"
    :portal="portal"
    :ui="tripModalUi"
  >
    <template #body>
      <div data-testid="modal-log-trip" class="space-y-4">
        <AppRoadDivider />

        <UAlert
          v-if="errorMessage"
          color="error"
          variant="subtle"
          data-testid="trip-modal-error"
          :title="errorMessage"
        />

        <UForm
          :schema="tripPayloadSchema"
          :state="formState"
          class="space-y-4"
          @submit="handleSubmit"
        >
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <UFormField label="Data da Viagem *" name="tripDate">
              <UInput
                v-model="formState.tripDate"
                type="date"
                class="w-full font-mono"
                data-testid="trip-date-input"
              />
            </UFormField>

            <UFormField label="Número da NF-e / Manifesto CT-e" name="invoiceNumber">
              <UInput
                v-model="formState.invoiceNumber"
                type="text"
                placeholder="Ex: 10824"
                class="w-full font-mono"
                data-testid="trip-invoice-input"
              />
            </UFormField>
          </div>

          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <UFormField label="Cidade de Origem (Cidade, UF) *" name="origin">
              <UInput
                v-model="formState.origin"
                type="text"
                placeholder="Ex: Santos, SP"
                class="w-full"
                data-testid="trip-origin-input"
              />
            </UFormField>

            <UFormField label="Cidade de Destino (Cidade, UF) *" name="destination">
              <UInput
                v-model="formState.destination"
                type="text"
                placeholder="Ex: Rondonópolis, MT"
                class="w-full"
                data-testid="trip-destination-input"
              />
            </UFormField>
          </div>

          <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
            <UFormField name="cargoWeightTons">
              <AppUnitInput
                :model-value="formState.cargoWeightTons ?? ''"
                label="Peso da Carga"
                suffix="ton"
                type="number"
                step="0.1"
                placeholder="32.5"
                data-testid="trip-cargo-input"
                @update:model-value="formState.cargoWeightTons = parseNumberField($event)"
              />
            </UFormField>

            <UFormField name="freightValueReais">
              <AppUnitInput
                :model-value="formState.freightValueReais ?? 0"
                label="Valor do Frete Bruto (R$)"
                prefix="R$"
                type="number"
                step="0.01"
                placeholder="18500.00"
                data-testid="trip-freight-input"
                @update:model-value="formState.freightValueReais = parseNumberField($event, true)"
              />
            </UFormField>

            <UFormField name="tollCostReais">
              <AppUnitInput
                :model-value="formState.tollCostReais ?? 0"
                label="Custo de Pedágios no Percurso"
                prefix="R$"
                type="number"
                step="0.01"
                placeholder="380.00"
                data-testid="trip-toll-input"
                @update:model-value="formState.tollCostReais = parseNumberField($event, true)"
              />
            </UFormField>
          </div>

          <TripOdometerBox
            v-model:km-start="formState.kmStart"
            v-model:km-end="formState.kmEnd"
            v-model:fuel-liters="formState.fuelLiters"
            v-model:fuel-cost-reais="formState.fuelCostReais"
            :toll-cost-reais="formState.tollCostReais"
          />

          <div class="flex items-center justify-end gap-3 border-t border-asphalt-border pt-4">
            <UButton
              type="button"
              label="Cancelar"
              color="neutral"
              variant="outline"
              data-testid="trip-modal-cancel-btn"
              @click="emit('close')"
            />
            <UButton
              type="submit"
              :loading="saving"
              :label="isEditing ? 'Salvar Alterações' : 'Salvar Viagem no Painel'"
              color="primary"
              data-testid="trip-modal-submit-btn"
              class="font-display font-semibold tracking-wider uppercase"
            />
          </div>
        </UForm>
      </div>
    </template>
  </UModal>
</template>
