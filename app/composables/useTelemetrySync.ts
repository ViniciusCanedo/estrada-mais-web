import {
  computed,
  getCurrentInstance,
  onMounted,
  onServerPrefetch,
  onUnmounted,
  watch,
  type ComputedRef,
  type Ref,
} from 'vue'
import type { HealthStatusPayload } from '#shared/schemas/health.schema'
import { useApiFetch } from './useApiFetch'
import { useCompetencePeriod } from './useCompetencePeriod'

const SYNC_INTERVAL_MS = 60_000
const MS_PER_MINUTE = 60_000
const MINUTES_PER_HOUR = 60

export interface TelemetrySyncState {
  isOnline: Ref<boolean>
  isHealthy: Ref<boolean>
  lastSyncLabel: ComputedRef<string>
  tripsCount: Ref<number>
  expensesCount: Ref<number>
  refreshSync: () => Promise<void>
}

interface TelemetryStateRefs {
  isOnline: Ref<boolean>
  isHealthy: Ref<boolean>
  lastSyncAt: Ref<number | null>
  nowTimestamp: Ref<number>
  tripsCount: Ref<number>
  expensesCount: Ref<number>
}

export function formatLastSyncLabel(lastSyncAt: number | null, nowMs: number): string {
  if (lastSyncAt === null) {
    return 'Aguardando sync'
  }

  const diffMinutes = Math.max(0, Math.floor((nowMs - lastSyncAt) / MS_PER_MINUTE))
  if (diffMinutes < 1) {
    return 'Agora mesmo'
  }
  if (diffMinutes < MINUTES_PER_HOUR) {
    return `Há ${diffMinutes} min`
  }

  const hours = Math.floor(diffMinutes / MINUTES_PER_HOUR)
  return `Há ${hours} h`
}

function useTelemetryStateRefs(): TelemetryStateRefs {
  return {
    isOnline: useState<boolean>('estrada-telemetry-online', () => true),
    isHealthy: useState<boolean>('estrada-telemetry-healthy', () => true),
    lastSyncAt: useState<number | null>('estrada-telemetry-last-sync-at', () => null),
    nowTimestamp: useState<number>('estrada-telemetry-now-ts', () => Date.now()),
    tripsCount: useState<number>('estrada-telemetry-trips-count', () => 0),
    expensesCount: useState<number>('estrada-telemetry-expenses-count', () => 0),
  }
}

function applyHealthPayload(refs: TelemetryStateRefs, payload: HealthStatusPayload): void {
  refs.isHealthy.value = payload.status === 'ok' && payload.database === 'connected'
  const now = Date.now()
  refs.nowTimestamp.value = now
  refs.lastSyncAt.value = now
  if (payload.navigationCounts) {
    refs.tripsCount.value = payload.navigationCounts.tripsCount
    refs.expensesCount.value = payload.navigationCounts.expensesCount
  }
}

function registerSyncBrowserListeners(
  refs: TelemetryStateRefs,
  refreshSync: () => Promise<void>,
): () => void {
  const onOnline = (): void => {
    refs.isOnline.value = true
    void refreshSync()
  }
  const onOffline = (): void => {
    refs.isOnline.value = false
  }
  const onFocus = (): void => {
    void refreshSync()
  }
  const onTick = (): void => {
    refs.nowTimestamp.value = Date.now()
    void refreshSync()
  }

  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
  window.addEventListener('focus', onFocus)
  const intervalId = window.setInterval(onTick, SYNC_INTERVAL_MS)

  return () => {
    window.removeEventListener('online', onOnline)
    window.removeEventListener('offline', onOffline)
    window.removeEventListener('focus', onFocus)
    window.clearInterval(intervalId)
  }
}

function attachTelemetryLifecycle(
  refs: TelemetryStateRefs,
  healthAsyncData: ReturnType<typeof useApiFetch<HealthStatusPayload>>,
  refreshSync: () => Promise<void>,
): void {
  if (!getCurrentInstance()) {
    return
  }

  let cleanupListeners: (() => void) | null = null

  onServerPrefetch(async () => {
    await healthAsyncData
    if (healthAsyncData.error.value) {
      refs.isHealthy.value = false
      return
    }
    if (healthAsyncData.data.value) {
      applyHealthPayload(refs, healthAsyncData.data.value)
    }
  })

  onMounted(() => {
    if (typeof navigator !== 'undefined') {
      refs.isOnline.value = navigator.onLine
    }
    cleanupListeners = registerSyncBrowserListeners(refs, refreshSync)
  })

  onUnmounted(() => {
    cleanupListeners?.()
  })
}

/**
 * Único ponto de consulta ao endpoint /api/health, expondo conectividade, saúde e contadores da Sidebar.
 */
export function useTelemetrySync(): TelemetrySyncState {
  const { selectedMonth } = useCompetencePeriod()
  const config = useRuntimeConfig()
  const refs = useTelemetryStateRefs()
  const lastSyncLabel = computed(() =>
    formatLastSyncLabel(refs.lastSyncAt.value, refs.nowTimestamp.value),
  )

  const healthAsyncData = useApiFetch<HealthStatusPayload>('/health', {
    key: 'telemetry-sync-health',
    query: computed(() => ({ month: selectedMonth.value })),
  })

  watch(
    [healthAsyncData.data, healthAsyncData.error],
    ([payload, err]) => {
      if (err) {
        refs.isHealthy.value = false
        return
      }
      if (payload) {
        applyHealthPayload(refs, payload)
      }
    },
    { immediate: true },
  )

  async function refreshSync(): Promise<void> {
    if (import.meta.client && typeof navigator !== 'undefined' && !navigator.onLine) {
      refs.isOnline.value = false
      return
    }
    const endpoint = `${config.public.apiBase.replace(/\/$/, '')}/health`
    try {
      const payload = await $fetch<HealthStatusPayload>(endpoint, {
        query: { month: selectedMonth.value },
      })
      refs.isOnline.value = true
      applyHealthPayload(refs, payload)
    } catch {
      refs.isHealthy.value = false
    }
  }

  attachTelemetryLifecycle(refs, healthAsyncData, refreshSync)

  return {
    isOnline: refs.isOnline,
    isHealthy: refs.isHealthy,
    lastSyncLabel,
    tripsCount: refs.tripsCount,
    expensesCount: refs.expensesCount,
    refreshSync,
  }
}
