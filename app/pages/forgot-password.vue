<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { reactive, ref } from 'vue'
import { forgotPasswordSchema, type ForgotPasswordInput } from '#shared/schemas/auth.schema'
import { extractAuthErrorMessage, useAuthSession } from '../composables/useAuthSession'

definePageMeta({
  layout: 'auth',
})

useHead({
  title: 'Recuperar Senha | Estrada+',
})

const { requestPasswordReset } = useAuthSession()

const formState = reactive<ForgotPasswordInput>({
  email: '',
})

const isSubmitting = ref(false)
const errorMessage = ref<string | null>(null)
const confirmationMessage = ref<string | null>(null)

async function handleSubmit(event: FormSubmitEvent<ForgotPasswordInput>): Promise<void> {
  isSubmitting.value = true
  errorMessage.value = null
  confirmationMessage.value = null

  try {
    confirmationMessage.value = await requestPasswordReset(event.data)
  } catch (error: unknown) {
    errorMessage.value = extractAuthErrorMessage(
      error,
      'Não foi possível processar a solicitação de recuperação.',
    )
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div data-testid="screen-forgot-password" class="space-y-5">
    <div>
      <span class="font-mono text-[11px] tracking-widest text-amber-default uppercase">
        RECUPERAÇÃO DE ACESSO
      </span>
      <h1 class="mt-1 font-display text-2xl font-bold text-white uppercase">Recuperar Senha</h1>
      <p class="mt-1 text-sm text-highway-muted">
        Informe seu e-mail cadastrado para receber um link temporário de redefinição.
      </p>
    </div>

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="subtle"
      data-testid="forgot-error-alert"
      :title="errorMessage"
    />

    <UAlert
      v-if="confirmationMessage"
      color="success"
      variant="subtle"
      data-testid="forgot-success-alert"
      title="Solicitação registrada"
      :description="confirmationMessage"
    />

    <UForm
      :schema="forgotPasswordSchema"
      :state="formState"
      class="space-y-4"
      @submit="handleSubmit"
    >
      <UFormField label="E-mail Cadastrado" name="email" required>
        <UInput
          v-model="formState.email"
          type="email"
          autocomplete="email"
          placeholder="motorista@estrada.com.br"
          icon="i-lucide-mail"
          size="lg"
          class="w-full"
          data-testid="forgot-email-input"
        />
      </UFormField>

      <div class="pt-1">
        <UButton
          type="submit"
          block
          size="lg"
          color="primary"
          :loading="isSubmitting"
          label="Enviar Link de Recuperação"
          data-testid="forgot-submit-btn"
          class="font-display font-semibold tracking-wider uppercase"
        />
      </div>
    </UForm>

    <div class="border-t border-asphalt-border pt-4 text-center">
      <NuxtLink
        to="/login"
        data-testid="back-to-login-link"
        class="inline-flex items-center gap-1.5 font-mono text-xs text-highway-muted underline-offset-4 hover:text-white hover:underline"
      >
        <UIcon name="i-lucide-arrow-left" class="size-3.5" />
        <span>Voltar para o login</span>
      </NuxtLink>
    </div>
  </div>
</template>
