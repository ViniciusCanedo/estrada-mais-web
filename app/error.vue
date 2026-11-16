<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{
  error: NuxtError
}>()

const statusLabel = computed(() => props.error.status ?? 500)
const errorMessage = computed(
  () => props.error.message || 'Ocorreu uma falha inesperada na rota solicitada.',
)

async function handleBackHome(): Promise<void> {
  await clearError({ redirect: '/' })
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-asphalt-bg p-6 text-highway-fg">
    <div class="w-full max-w-md rounded-lg border border-asphalt-border bg-asphalt-surface p-6">
      <div class="space-y-2">
        <span class="font-mono text-xs tracking-widest text-amber-default uppercase">
          ESTRADA+ • ALERTA DE ROTA
        </span>
        <h1 class="font-display text-4xl font-bold text-white uppercase">Erro {{ statusLabel }}</h1>
        <p class="text-sm text-highway-muted">
          {{ errorMessage }}
        </p>
      </div>

      <div class="my-5 road-divider" aria-hidden="true" />

      <div class="flex items-center justify-between gap-3">
        <NuxtLink to="/" class="font-mono text-xs text-highway-muted underline hover:text-white">
          Ir para início
        </NuxtLink>
        <button
          type="button"
          class="rounded-sm bg-amber-default px-4 py-2 font-display text-xs font-semibold tracking-wider text-asphalt-bg uppercase transition-colors hover:bg-amber-hover"
          @click="handleBackHome"
        >
          Voltar ao Painel Principal
        </button>
      </div>
    </div>
  </div>
</template>
