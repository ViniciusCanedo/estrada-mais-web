<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { reactive, watch } from 'vue'
import {
  updateCredentialsSchema,
  type UpdateCredentialsInput,
} from '#shared/schemas/settings.schema'

const props = withDefaults(
  defineProps<{
    email: string
    updatedAt: string
    saving?: boolean
    errorMessage?: string | null
  }>(),
  {
    saving: false,
    errorMessage: null,
  },
)

const emit = defineEmits<{
  submit: [payload: UpdateCredentialsInput]
}>()

type CredentialsFormState = {
  [K in keyof UpdateCredentialsInput]-?: NonNullable<UpdateCredentialsInput[K]>
}

const formState = reactive<CredentialsFormState>({
  email: props.email,
  currentPassword: '',
  newPassword: '',
})

watch(
  () => [props.email, props.updatedAt] as const,
  ([nextEmail]) => {
    formState.email = nextEmail
    formState.currentPassword = ''
    formState.newPassword = ''
  },
)

function handleSubmit(event: FormSubmitEvent<UpdateCredentialsInput>): void {
  emit('submit', event.data)
}
</script>

<template>
  <section
    data-testid="settings-credentials-card"
    class="space-y-4 rounded-lg border border-asphalt-border bg-asphalt-surface p-6"
  >
    <h2 class="flex items-center gap-2 font-display text-lg tracking-wide text-white uppercase">
      <UIcon name="i-lucide-lock" class="size-4 text-highway-muted" />
      <span>Segurança &amp; Acesso</span>
    </h2>

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="subtle"
      data-testid="settings-credentials-error"
      :title="errorMessage"
    />

    <UForm
      :schema="updateCredentialsSchema"
      :state="formState"
      class="space-y-4"
      @submit="handleSubmit"
    >
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <UFormField label="E-mail de Acesso" name="email" required class="md:col-span-2">
          <UInput
            v-model="formState.email"
            type="email"
            autocomplete="email"
            placeholder="motorista@estrada.com.br"
            class="w-full font-mono"
            data-testid="settings-email-input"
          />
        </UFormField>

        <UFormField label="Senha Atual" name="currentPassword" hint="Obrigatória ao alterar senha">
          <UInput
            v-model="formState.currentPassword"
            type="password"
            autocomplete="current-password"
            placeholder="••••••••••••"
            class="w-full"
            data-testid="settings-current-password-input"
          />
        </UFormField>

        <UFormField label="Nova Senha" name="newPassword" hint="Opcional (8–128 caracteres)">
          <UInput
            v-model="formState.newPassword"
            type="password"
            autocomplete="new-password"
            placeholder="••••••••••••"
            class="w-full"
            data-testid="settings-new-password-input"
          />
        </UFormField>
      </div>

      <div
        data-testid="settings-biometric-note"
        class="flex items-start gap-2 rounded-sm border border-asphalt-border bg-asphalt-bg p-3 text-xs text-highway-muted"
      >
        <UIcon name="i-lucide-info" class="mt-0.5 size-4 shrink-0 text-amber-default" />
        <span>
          Nota desktop: Desbloqueio biométrico (FaceID/Impressão digital) é exclusivo da versão
          mobile e está desativado nesta estação de mesa.
        </span>
      </div>

      <div class="flex justify-end border-t border-asphalt-border pt-3">
        <UButton
          type="submit"
          color="primary"
          variant="outline"
          :loading="saving"
          label="Salvar Credenciais"
          data-testid="settings-save-credentials-btn"
          class="font-mono text-xs"
        />
      </div>
    </UForm>
  </section>
</template>
