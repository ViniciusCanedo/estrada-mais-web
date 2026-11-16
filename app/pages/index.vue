<script setup lang="ts">
import type { HealthStatusPayload } from '#shared/schemas/health.schema'

const {
  data: health,
  status: healthStatus,
  error: healthError,
  refresh: refreshHealth,
} = await useApiFetch<HealthStatusPayload>('/health', {
  key: 'health-status',
})

const manualCheckLoading = ref(false)
const manualCheckResult = ref<HealthStatusPayload | null>(null)
const manualCheckError = ref<string | null>(null)

async function handleManualFetch(): Promise<void> {
  manualCheckLoading.value = true
  manualCheckError.value = null
  try {
    manualCheckResult.value = await $fetch<HealthStatusPayload>('/api/health')
  } catch {
    manualCheckError.value = 'Não foi possível verificar a saúde do servidor.'
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
            <UIcon name="i-lucide-truck" class="size-6 text-primary" />
            <h1 class="text-2xl font-bold text-highlighted">Estrada+ Telemetria</h1>
          </div>
          <p class="text-sm text-muted">
            Fundação Nuxt 4, Drizzle ORM + SQLite (WAL), Zod isomórfico e Quality Gates ativos.
          </p>
        </div>
        <UColorModeButton />
      </header>

      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2 font-semibold text-highlighted">
              <UIcon name="i-lucide-activity" class="size-5 text-primary" />
              <span>Saúde da Plataforma &amp; SQLite</span>
            </div>
            <UBadge :color="health?.status === 'ok' ? 'success' : 'neutral'" variant="subtle">
              {{ healthStatus }}
            </UBadge>
          </div>
        </template>

        <div class="space-y-4">
          <UAlert
            v-if="healthError || manualCheckError"
            color="error"
            variant="subtle"
            title="Falha ao consultar /api/health"
            :description="manualCheckError ?? 'O serviço ou banco de dados está indisponível.'"
          />

          <div v-else-if="healthStatus === 'pending'" class="rounded-lg bg-elevated p-4 text-sm">
            <span class="text-muted">Verificando conectividade com o SQLite...</span>
          </div>

          <div v-else-if="!health" class="rounded-lg bg-elevated p-4 text-sm">
            <span class="text-muted">Nenhum dado de telemetria disponível no momento.</span>
          </div>

          <div v-else class="space-y-2 rounded-lg bg-elevated p-4 text-sm">
            <div class="flex items-center justify-between">
              <span class="text-muted">Status da API:</span>
              <span data-testid="health-status-value" class="font-medium text-highlighted">
                {{ health.status }}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-muted">Banco SQLite:</span>
              <span data-testid="health-database-value" class="font-mono text-xs text-highlighted">
                {{ health.database }}
              </span>
            </div>
            <div v-if="manualCheckResult" class="flex items-center justify-between">
              <span class="text-muted">Último $fetch manual:</span>
              <span data-testid="manual-health-timestamp" class="font-mono text-xs text-toned">
                {{ manualCheckResult.timestamp }}
              </span>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <UButton
              data-testid="refresh-health-btn"
              icon="i-lucide-refresh-cw"
              label="Atualizar Status"
              color="neutral"
              variant="outline"
              @click="refreshHealth()"
            />
            <UButton
              data-testid="manual-fetch-btn"
              icon="i-lucide-zap"
              label="Verificar via $fetch"
              color="primary"
              variant="soft"
              :loading="manualCheckLoading"
              @click="handleManualFetch()"
            />
          </div>
        </div>
      </UCard>
    </UContainer>
  </div>
</template>
