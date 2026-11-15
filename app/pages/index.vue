<script setup lang="ts">
import type { HealthResponse } from '#shared/http/api.schemas'
import { getGetHealthUrl, getHealth } from '#shared/http/system/system'

const counter = useCounterStore()

const {
  data: health,
  status: healthStatus,
  refresh: refreshHealth,
} = await useApiFetch<HealthResponse>(getGetHealthUrl())

const manualCheckLoading = ref(false)
const manualCheckResult = ref<HealthResponse | null>(null)

async function handleManualFetch() {
  manualCheckLoading.value = true
  try {
    manualCheckResult.value = await getHealth()
  } finally {
    manualCheckLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-default py-12 text-default">
    <UContainer class="max-w-3xl space-y-6">
      <header class="flex items-center justify-between border-b border-default pb-6">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-layers" class="size-6 text-primary" />
            <h1 class="text-2xl font-bold text-highlighted">Nuxt 4 Scaffolding</h1>
          </div>
          <p class="text-sm text-muted">
            Nuxt UI v4, Pinia, Orval ($fetch &amp; useFetch), Vitest e Playwright configurados.
          </p>
        </div>
        <UColorModeButton />
      </header>

      <div class="grid gap-6 md:grid-cols-2">
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 font-semibold text-highlighted">
                <UIcon name="i-lucide-database" class="size-5 text-primary" />
                <span>Pinia Store</span>
              </div>
              <UBadge color="primary" variant="subtle"> Estado Reativo </UBadge>
            </div>
          </template>

          <div class="space-y-4">
            <div class="flex items-baseline justify-between rounded-lg bg-elevated p-4">
              <span class="text-sm text-muted">Contador atual</span>
              <span data-testid="counter-value" class="text-2xl font-bold text-highlighted">
                {{ counter.count }}
              </span>
            </div>

            <div class="flex items-center gap-2">
              <UButton
                data-testid="increment-btn"
                icon="i-lucide-plus"
                label="Incrementar"
                color="primary"
                @click="counter.increment()"
              />
              <UButton
                data-testid="reset-btn"
                icon="i-lucide-rotate-ccw"
                label="Resetar"
                color="neutral"
                variant="outline"
                @click="counter.reset()"
              />
            </div>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 font-semibold text-highlighted">
                <UIcon name="i-lucide-globe" class="size-5 text-primary" />
                <span>Orval HTTP (SSR &amp; Client)</span>
              </div>
              <UBadge :color="health?.status === 'ok' ? 'success' : 'neutral'" variant="subtle">
                {{ healthStatus }}
              </UBadge>
            </div>
          </template>

          <div class="space-y-4">
            <div class="space-y-1 rounded-lg bg-elevated p-4 text-sm">
              <div class="flex items-center justify-between">
                <span class="text-muted">Status (useFetch):</span>
                <span class="font-medium text-highlighted">{{ health?.status ?? '—' }}</span>
              </div>
              <div v-if="manualCheckResult" class="flex items-center justify-between">
                <span class="text-muted">Último $fetch:</span>
                <span class="font-mono text-xs text-toned">{{ manualCheckResult.timestamp }}</span>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <UButton
                icon="i-lucide-refresh-cw"
                label="useFetch Refresh"
                color="neutral"
                variant="outline"
                @click="refreshHealth()"
              />
              <UButton
                icon="i-lucide-zap"
                label="Testar $fetch"
                color="primary"
                variant="soft"
                :loading="manualCheckLoading"
                @click="handleManualFetch()"
              />
            </div>
          </div>
        </UCard>
      </div>
    </UContainer>
  </div>
</template>
