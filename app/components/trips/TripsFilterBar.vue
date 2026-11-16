<script setup lang="ts">
import { computed, onUnmounted, ref, useId, watch } from 'vue'
import type { TripPeriodOption } from '#shared/schemas/trip.schema'

const props = defineProps<{
  search: string
  period: TripPeriodOption
  selectedState: string
  availableStates: readonly string[]
}>()

const emit = defineEmits<{
  'update:search': [value: string]
  'update:period': [value: TripPeriodOption]
  'update:selectedState': [value: string]
  create: []
}>()

const SEARCH_DEBOUNCE_MS = 150
const searchInputId = useId()
const periodSelectId = useId()
const localSearch = ref(props.search)
let debounceTimer: ReturnType<typeof setTimeout> | null = null

watch(
  () => props.search,
  (nextSearch) => {
    if (nextSearch !== localSearch.value) {
      localSearch.value = nextSearch
    }
  },
)

function clearDebounce(): void {
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
}

onUnmounted(clearDebounce)

function handleSearchInput(event: Event): void {
  if (!(event.target instanceof HTMLInputElement)) {
    return
  }
  const value = event.target.value
  localSearch.value = value
  clearDebounce()

  if (value.trim().length === 0) {
    emit('update:search', '')
    return
  }

  debounceTimer = setTimeout(() => {
    emit('update:search', value)
  }, SEARCH_DEBOUNCE_MS)
}

function flushSearch(): void {
  clearDebounce()
  emit('update:search', localSearch.value)
}

function handlePeriodChange(event: Event): void {
  if (!(event.target instanceof HTMLSelectElement)) {
    return
  }
  const value = event.target.value
  if (value === 'month' || value === 'last90days' || value === 'year') {
    emit('update:period', value)
  }
}

const stateTags = computed(() => ['TODOS', ...props.availableStates])
</script>

<template>
  <section
    aria-label="Filtros e ações de viagens"
    class="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-asphalt-border bg-asphalt-surface p-4"
  >
    <div class="flex flex-wrap items-center gap-3">
      <div class="relative">
        <label :for="searchInputId" class="block">
          <span class="sr-only">Buscar origem, destino ou NF-e</span>
          <UIcon
            name="i-lucide-search"
            class="pointer-events-none absolute top-2.5 left-2.5 size-3.5 text-highway-muted"
          />
          <input
            :id="searchInputId"
            :value="localSearch"
            type="search"
            placeholder="Buscar origem, destino ou NF..."
            data-testid="trips-search-input"
            class="w-64 rounded-sm border border-asphalt-border bg-asphalt-bg py-1.5 pr-3 pl-8 text-xs text-white placeholder:text-highway-muted/60 focus:border-amber-default focus:outline-none"
            @input="handleSearchInput"
            @keydown.enter="flushSearch"
          />
        </label>
      </div>

      <div>
        <label :for="periodSelectId" class="block">
          <span class="sr-only">Período de listagem</span>
          <select
            :id="periodSelectId"
            :value="period"
            data-testid="trips-period-select"
            class="rounded-sm border border-asphalt-border bg-asphalt-bg px-3 py-1.5 text-xs text-white focus:border-amber-default focus:outline-none"
            @change="handlePeriodChange"
          >
            <option value="month">Mês Selecionado</option>
            <option value="last90days">Últimos 90 dias</option>
            <option value="year">Ano Completo</option>
          </select>
        </label>
      </div>

      <div
        class="flex flex-wrap items-center gap-1 text-xs"
        role="group"
        aria-label="Filtrar por UF"
      >
        <span class="mr-1 font-mono text-[11px] text-highway-muted">ESTADOS:</span>
        <button
          v-for="uf in stateTags"
          :key="uf"
          type="button"
          :aria-pressed="selectedState === uf"
          :data-testid="`trips-state-filter-${uf}`"
          class="rounded-sm border bg-asphalt-bg px-2 py-0.5 font-mono text-[10px] transition-colors"
          :class="
            selectedState === uf
              ? 'border-amber-default text-amber-default'
              : 'border-asphalt-border text-highway-muted hover:text-white'
          "
          @click="emit('update:selectedState', uf)"
        >
          {{ uf }}
        </button>
      </div>
    </div>

    <button
      type="button"
      data-testid="new-trip-btn"
      class="rounded-sm bg-amber-default px-4 py-1.5 font-display text-xs font-semibold tracking-wider text-asphalt-bg uppercase shadow-xs transition-colors hover:bg-amber-hover"
      @click="emit('create')"
    >
      + Nova Viagem
    </button>
  </section>
</template>
