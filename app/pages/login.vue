<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { computed, reactive, ref } from 'vue'
import { loginSchema, type LoginInput } from '#shared/schemas/auth.schema'
import { extractAuthErrorMessage, useAuthSession } from '../composables/useAuthSession'

definePageMeta({
  layout: 'auth',
})

useHead({
  title: 'Entrar | Estrada+',
})

const route = useRoute()
const { login } = useAuthSession()

const formState = reactive<LoginInput>({
  email: '',
  password: '',
})

const isSubmitting = ref(false)
const errorMessage = ref<string | null>(null)
const showResetSuccessBanner = computed(() => route.query.reset === 'success')

async function handleSubmit(event: FormSubmitEvent<LoginInput>): Promise<void> {
  isSubmitting.value = true
  errorMessage.value = null

  try {
    await login(event.data)
    await navigateTo('/', { replace: true })
  } catch (error: unknown) {
    errorMessage.value = extractAuthErrorMessage(
      error,
      'Não foi possível entrar. Verifique suas credenciais.',
    )
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div data-testid="screen-login" class="space-y-5">
    <div>
      <span class="font-mono text-[11px] tracking-widest text-amber-default uppercase">
        ACESSO DO MOTORISTA
      </span>
      <h1 class="mt-1 font-display text-2xl font-bold text-white uppercase">Entrar no Painel</h1>
      <p class="mt-1 text-sm text-highway-muted">
        Informe seu e-mail e senha para acompanhar rotas, abastecimentos e despesas.
      </p>
    </div>

    <UAlert
      v-if="showResetSuccessBanner"
      color="success"
      variant="subtle"
      data-testid="login-reset-success-alert"
      title="Senha redefinida com sucesso"
      description="Faça login utilizando sua nova senha de acesso."
    />

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="subtle"
      data-testid="login-error-alert"
      :title="errorMessage"
    />

    <UForm :schema="loginSchema" :state="formState" class="space-y-4" @submit="handleSubmit">
      <UFormField label="E-mail de Acesso" name="email" required>
        <UInput
          v-model="formState.email"
          type="email"
          autocomplete="email"
          placeholder="motorista@estrada.com.br"
          icon="i-lucide-mail"
          size="lg"
          class="w-full"
          data-testid="login-email-input"
        />
      </UFormField>

      <UFormField label="Senha" name="password" required>
        <UInput
          v-model="formState.password"
          type="password"
          autocomplete="current-password"
          placeholder="••••••••"
          icon="i-lucide-lock"
          size="lg"
          class="w-full"
          data-testid="login-password-input"
        />
      </UFormField>

      <div class="pt-1">
        <UButton
          type="submit"
          block
          size="lg"
          color="primary"
          :loading="isSubmitting"
          label="Entrar no Painel"
          data-testid="login-submit-btn"
          class="font-display font-semibold tracking-wider uppercase"
        />
      </div>
    </UForm>

    <div class="border-t border-asphalt-border pt-4 text-center">
      <NuxtLink
        to="/forgot-password"
        data-testid="forgot-password-link"
        class="font-mono text-xs text-amber-default underline-offset-4 hover:underline"
      >
        Esqueceu sua senha?
      </NuxtLink>
    </div>
  </div>
</template>
