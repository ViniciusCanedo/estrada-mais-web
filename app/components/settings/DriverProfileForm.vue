<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { reactive, watch } from 'vue'
import {
  updateDriverProfileSchema,
  type DriverSettingsResponse,
  type UpdateDriverProfileInput,
} from '#shared/schemas/settings.schema'

type DriverProfileFields = Pick<
  DriverSettingsResponse,
  'name' | 'rntrc' | 'vehicleModel' | 'vehiclePlates'
>

const props = withDefaults(
  defineProps<{
    profile: DriverProfileFields
    saving?: boolean
    errorMessage?: string | null
  }>(),
  {
    saving: false,
    errorMessage: null,
  },
)

const emit = defineEmits<{
  submit: [payload: UpdateDriverProfileInput]
}>()

const formState = reactive<UpdateDriverProfileInput>({
  name: props.profile.name,
  rntrc: props.profile.rntrc,
  vehicleModel: props.profile.vehicleModel,
  vehiclePlates: props.profile.vehiclePlates,
})

watch(
  () => props.profile,
  (nextProfile) => {
    formState.name = nextProfile.name
    formState.rntrc = nextProfile.rntrc
    formState.vehicleModel = nextProfile.vehicleModel
    formState.vehiclePlates = nextProfile.vehiclePlates
  },
  { deep: true },
)

function handleSubmit(event: FormSubmitEvent<UpdateDriverProfileInput>): void {
  emit('submit', event.data)
}
</script>

<template>
  <section
    data-testid="settings-profile-card"
    class="space-y-4 rounded-lg border border-asphalt-border bg-asphalt-surface p-6"
  >
    <h2 class="flex items-center gap-2 font-display text-lg tracking-wide text-white uppercase">
      <UIcon name="i-lucide-user" class="size-4 text-amber-default" />
      <span>Identificação do Transportador Autônomo</span>
    </h2>

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="subtle"
      data-testid="settings-profile-error"
      :title="errorMessage"
    />

    <UForm
      :schema="updateDriverProfileSchema"
      :state="formState"
      class="space-y-4"
      @submit="handleSubmit"
    >
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <UFormField label="Nome Completo" name="name" required>
          <UInput
            v-model="formState.name"
            type="text"
            autocomplete="name"
            placeholder="Valdir Silveira"
            class="w-full"
            data-testid="settings-name-input"
          />
        </UFormField>

        <UFormField label="Registro RNTRC (ANTT)" name="rntrc" required>
          <UInput
            v-model="formState.rntrc"
            type="text"
            placeholder="58.912.440-TAC"
            class="w-full font-mono"
            data-testid="settings-rntrc-input"
          />
        </UFormField>

        <UFormField label="Cavalo Mecânico (Marca / Modelo)" name="vehicleModel" required>
          <UInput
            v-model="formState.vehicleModel"
            type="text"
            placeholder="Scania R450 Highline 6x2 (2021)"
            class="w-full"
            data-testid="settings-vehicle-model-input"
          />
        </UFormField>

        <UFormField label="Placas (Cavalo / Carreta)" name="vehiclePlates" required>
          <UInput
            v-model="formState.vehiclePlates"
            type="text"
            placeholder="BRA-2E19 / CUR-4901"
            class="w-full font-mono"
            data-testid="settings-vehicle-plates-input"
          />
        </UFormField>
      </div>

      <div class="flex justify-end border-t border-asphalt-border pt-3">
        <UButton
          type="submit"
          color="primary"
          variant="outline"
          :loading="saving"
          label="Salvar Alterações Cadastrais"
          data-testid="settings-save-profile-btn"
          class="font-mono text-xs"
        />
      </div>
    </UForm>
  </section>
</template>
