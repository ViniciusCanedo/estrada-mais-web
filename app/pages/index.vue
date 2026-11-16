<script setup lang="ts">
import type { HealthStatusPayload } from '#shared/schemas/health.schema'
import { useCompetencePeriod } from '~/composables/useCompetencePeriod'

const { formattedMonthLabel } = useCompetencePeriod()

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
  <div data-testid="screen-dashboard" class="space-y-6">
    <div class="border-b border-asphalt-border pb-4">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span class="font-mono text-xs tracking-widest text-amber-default uppercase">
            TELEMETRIA &amp; CONTROLE OPERACIONAL • {{ formattedMonthLabel }}
          </span>
          <h1 class="mt-1 font-display text-3xl font-bold text-white uppercase">
            Estrada+ Telemetria
          </h1>
          <p class="mt-1 text-sm text-highway-muted">
            Shell Night Highway, Drizzle ORM + SQLite (WAL) e monitoramento em tempo real ativos.
          </p>
        </div>

        <UBadge
          :color="health?.status === 'ok' ? 'success' : 'neutral'"
          variant="subtle"
          class="font-mono uppercase"
        >
          {{ healthStatus }}
        </UBadge>
      </div>
    </div>

    <div class="rounded-lg border border-asphalt-border bg-asphalt-surface p-6">
      <div class="mb-4 flex items-center justify-between">
        <div
          class="flex items-center gap-2 font-display text-lg tracking-wide text-white uppercase"
        >
          <UIcon name="i-lucide-activity" class="size-5 text-amber-default" />
          <span>Saúde da Plataforma &amp; SQLite</span>
        </div>
        <span class="font-mono text-xs text-highway-muted">/api/health</span>
      </div>

      <div class="space-y-4">
        <UAlert
          v-if="healthError || manualCheckError"
          color="error"
          variant="subtle"
          title="Falha ao consultar /api/health"
          :description="manualCheckError ?? 'O serviço ou banco de dados está indisponível.'"
        />

        <div
          v-else-if="healthStatus === 'pending'"
          class="rounded-sm border border-asphalt-border bg-asphalt-bg p-4 font-mono text-sm text-highway-muted"
        >
          Verificando conectividade com o SQLite...
        </div>

        <div
          v-else-if="!health"
          class="rounded-sm border border-asphalt-border bg-asphalt-bg p-4 font-mono text-sm text-highway-muted"
        >
          Nenhum dado de telemetria disponível no momento.
        </div>

        <div
          v-else
          class="space-y-2 rounded-sm border border-asphalt-border bg-asphalt-bg p-4 text-sm"
        >
          <div class="flex items-center justify-between">
            <span class="text-highway-muted">Status da API:</span>
            <span data-testid="health-status-value" class="font-mono font-semibold text-white">
              {{ health.status }}
            </span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-highway-muted">Banco SQLite:</span>
            <span data-testid="health-database-value" class="font-mono text-xs text-highway-green">
              {{ health.database }}
            </span>
          </div>
          <div v-if="manualCheckResult" class="flex items-center justify-between">
            <span class="text-highway-muted">Último $fetch manual:</span>
            <span
              data-testid="manual-health-timestamp"
              class="font-mono text-xs text-amber-default"
            >
              {{ manualCheckResult.timestamp }}
            </span>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-3">
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
            color="secondary"
            variant="outline"
            :loading="manualCheckLoading"
            @click="handleManualFetch()"
          />
        </div>
      </div>
    </div>
  </div>
</template>
