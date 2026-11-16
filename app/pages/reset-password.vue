<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { computed, reactive, ref, watch } from 'vue'
import { resetPasswordSchema, type ResetPasswordInput } from '#shared/schemas/auth.schema'
import { extractAuthErrorMessage, useAuthSession } from '../composables/useAuthSession'

definePageMeta({
  layout: 'auth',
})

useHead({
  title: 'Redefinir Senha | Estrada+',
})

const route = useRoute()
const { confirmPasswordReset } = useAuthSession()

const queryToken = computed(() => {
  const raw = route.query.token
  return typeof raw === 'string' ? raw.trim() : ''
})

const formState = reactive<ResetPasswordInput>({
  token: queryToken.value,
  password: '',
  confirmPassword: '',
})

watch(
  queryToken,
  (nextToken) => {
    formState.token = nextToken
  },
  { immediate: true },
)

const isSubmitting = ref(false)
const errorMessage = ref<string | null>(null)
const hasMissingToken = computed(() => queryToken.value.length === 0)

async function handleSubmit(event: FormSubmitEvent<ResetPasswordInput>): Promise<void> {
  isSubmitting.value = true
  errorMessage.value = null

  try {
    await confirmPasswordReset(event.data)
    await navigateTo({ path: '/login', query: { reset: 'success' } }, { replace: true })
  } catch (error: unknown) {
    errorMessage.value = extractAuthErrorMessage(
      error,
      'Não foi possível redefinir a senha. Solicite um novo link.',
    )
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div data-testid="screen-reset-password" class="space-y-5">
    <div>
      <span class="font-mono text-[11px] tracking-widest text-amber-default uppercase">
        NOVA CREDENCIAL
      </span>
      <h1 class="mt-1 font-display text-2xl font-bold text-white uppercase">Redefinir Senha</h1>
      <p class="mt-1 text-sm text-highway-muted">
        Escolha uma nova senha com no mínimo 8 caracteres para acessar o Estrada+.
      </p>
    </div>

    <UAlert
      v-if="hasMissingToken"
      color="error"
      variant="subtle"
      data-testid="reset-missing-token-alert"
      title="Link de recuperação ausente ou inválido"
      description="Solicite um novo link de recuperação de senha para continuar."
    />

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="subtle"
      data-testid="reset-error-alert"
      :title="errorMessage"
    />

    <UForm
      :schema="resetPasswordSchema"
      :state="formState"
      class="space-y-4"
      @submit="handleSubmit"
    >
      <UFormField label="Nova Senha" name="password" required>
        <UInput
          v-model="formState.password"
          type="password"
          autocomplete="new-password"
          placeholder="Mínimo 8 caracteres"
          icon="i-lucide-lock"
          size="lg"
          class="w-full"
          :disabled="hasMissingToken"
          data-testid="reset-password-input"
        />
      </UFormField>

      <UFormField label="Confirmar Nova Senha" name="confirmPassword" required>
        <UInput
          v-model="formState.confirmPassword"
          type="password"
          autocomplete="new-password"
          placeholder="Repita a nova senha"
          icon="i-lucide-shield-check"
          size="lg"
          class="w-full"
          :disabled="hasMissingToken"
          data-testid="reset-confirm-password-input"
        />
      </UFormField>

      <div class="pt-1">
        <UButton
          type="submit"
          block
          size="lg"
          color="primary"
          :loading="isSubmitting"
          :disabled="hasMissingToken"
          label="Redefinir Senha"
          data-testid="reset-submit-btn"
          class="font-display font-semibold tracking-wider uppercase"
        />
      </div>
    </UForm>

    <div class="border-t border-asphalt-border pt-4 text-center">
      <NuxtLink
        to="/forgot-password"
        data-testid="request-new-link"
        class="font-mono text-xs text-highway-muted underline-offset-4 hover:text-white hover:underline"
      >
        Solicitar novo link de recuperação
      </NuxtLink>
    </div>
  </div>
</template>
