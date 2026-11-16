<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  isOnline: boolean
  isHealthy: boolean
  lastSyncLabel: string
}>()

const isSynced = computed(() => props.isOnline && props.isHealthy)
const statusSubtitle = computed(() => {
  if (isSynced.value) {
    return props.lastSyncLabel
  }
  return props.isOnline ? 'Falha ao consultar API' : 'Sem conexão de rede'
})
</script>

<template>
  <div
    data-testid="sync-status-indicator"
    class="flex items-center justify-between rounded-sm border border-asphalt-border bg-asphalt-bg p-2.5"
  >
    <div class="flex items-center gap-2">
      <div class="relative flex size-2.5 items-center justify-center">
        <span v-if="isSynced" class="absolute size-3.5 radar-pulse rounded-full bg-highway-green" />
        <span
          class="relative size-2 rounded-full"
          :class="isSynced ? 'bg-highway-green' : 'bg-highway-red'"
        />
      </div>
      <div>
        <p
          class="font-mono text-[11px] font-semibold tracking-wider"
          :class="isSynced ? 'text-white' : 'text-highway-red'"
        >
          {{ isSynced ? 'SYNC OK' : 'OFFLINE / ERRO SYNC' }}
        </p>
        <p class="text-[10px] text-highway-muted">
          {{ statusSubtitle }}
        </p>
      </div>
    </div>

    <span
      class="rounded-sm border border-asphalt-border bg-asphalt-surface px-1.5 py-0.5 font-mono text-[10px]"
      :class="isOnline ? 'text-highway-green' : 'text-highway-red'"
    >
      {{ isOnline ? 'ONLINE' : 'OFFLINE' }}
    </span>
  </div>
</template>
