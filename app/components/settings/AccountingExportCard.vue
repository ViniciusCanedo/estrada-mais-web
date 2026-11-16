<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  month: string
  monthLabel: string
}>()

const csvHref = computed(() => `/api/reports/csv?month=${encodeURIComponent(props.month)}`)
const csvFilename = computed(() => `estrada-mais-relatorio-${props.month}.csv`)
const printRoute = computed(() => ({
  path: '/reports/print',
  query: { month: props.month },
}))
</script>

<template>
  <section
    data-testid="settings-accounting-export-card"
    class="space-y-4 rounded-lg border border-asphalt-border bg-asphalt-surface p-6"
  >
    <h2 class="font-display text-lg tracking-wide text-white uppercase">Exportação Contábil</h2>
    <p class="text-xs text-highway-muted">
      Exporte dados consolidados de {{ monthLabel }} para comprovação de IRPF (Livro-Caixa / Carnê
      Leão do Caminhoneiro).
    </p>

    <div class="space-y-2">
      <a
        :href="csvHref"
        :download="csvFilename"
        data-testid="export-csv-btn"
        class="flex w-full items-center justify-center gap-2 rounded-sm border border-asphalt-border bg-asphalt-bg px-3 py-2 font-mono text-xs text-white transition-colors hover:border-white"
      >
        <UIcon name="i-lucide-file-spreadsheet" class="size-4 text-highway-green" />
        <span>Baixar Relatório CSV Completo</span>
      </a>

      <NuxtLink
        :to="printRoute"
        data-testid="export-print-pdf-btn"
        class="flex w-full items-center justify-center gap-2 rounded-sm border border-asphalt-border bg-asphalt-bg px-3 py-2 font-mono text-xs text-white transition-colors hover:border-white"
      >
        <UIcon name="i-lucide-printer" class="size-4 text-expense-blue" />
        <span>Imprimir Relatório Mensal PDF</span>
      </NuxtLink>
    </div>
  </section>
</template>
