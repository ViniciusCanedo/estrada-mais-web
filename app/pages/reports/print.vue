<script setup lang="ts">
import { computed } from 'vue'
import { competenceMonthSchema } from '#shared/schemas/common.schema'
import { toCents, toMilliKmL } from '#shared/utils/units'
import { useCompetencePeriod } from '~/composables/useCompetencePeriod'
import { usePrintReport } from '~/composables/useDashboard'
import { formatPercentPtBr } from '~/utils/dashboard'
import { EXPENSE_CATEGORY_META, PAYMENT_METHOD_META } from '~/utils/expenses'
import {
  formatCurrencyFromCents,
  formatDateBr,
  formatKm,
  formatKmPerLiterFromMilli,
} from '~/utils/formatters'

definePageMeta({
  layout: 'print',
})

useHead({
  title: 'Relatório Contábil Mensal | Estrada+',
})

const route = useRoute()
const { selectedMonth } = useCompetencePeriod()

const reportMonth = computed(() => {
  const parsed = competenceMonthSchema.safeParse(route.query.month)
  return parsed.success ? parsed.data : selectedMonth.value
})

const { dashboard, trips, expenses, pending, error, refresh } = usePrintReport(reportMonth)

function triggerPrint(): void {
  if (import.meta.client) {
    window.print()
  }
}
</script>

<template>
  <div data-testid="screen-reports-print" class="space-y-6">
    <nav
      aria-label="Ações de impressão"
      data-testid="print-toolbar"
      class="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-4 print:hidden"
    >
      <NuxtLink
        to="/settings"
        data-testid="print-back-settings"
        class="inline-flex items-center gap-2 rounded-sm border border-neutral-300 px-3 py-1.5 font-mono text-xs text-neutral-700 hover:bg-neutral-100"
      >
        <span aria-hidden="true">&larr;</span>
        <span>Voltar para Configurações</span>
      </NuxtLink>

      <button
        type="button"
        data-testid="trigger-print-btn"
        class="inline-flex items-center gap-2 rounded-sm bg-neutral-900 px-4 py-2 font-mono text-xs font-semibold text-white hover:bg-neutral-800"
        @click="triggerPrint()"
      >
        <UIcon name="i-lucide-printer" class="size-4" />
        <span>Imprimir / Salvar PDF</span>
      </button>
    </nav>

    <div
      v-if="pending && !dashboard"
      data-testid="print-loading-state"
      class="rounded-sm border border-neutral-200 p-6 font-mono text-sm text-neutral-600"
    >
      Preparando relatório contábil para impressão...
    </div>

    <div
      v-else-if="error && !dashboard"
      data-testid="print-error-state"
      class="space-y-3 rounded-sm border border-red-300 bg-red-50 p-6 text-sm text-red-800"
    >
      <p class="font-semibold">Não foi possível carregar o relatório contábil.</p>
      <button
        type="button"
        data-testid="print-retry-btn"
        class="rounded-sm border border-red-400 px-3 py-1 font-mono text-xs hover:bg-red-100"
        @click="refresh()"
      >
        Tentar novamente
      </button>
    </div>

    <div
      v-else-if="!dashboard"
      data-testid="print-empty-state"
      class="rounded-sm border border-neutral-200 p-6 font-mono text-sm text-neutral-600"
    >
      Nenhum dado disponível para emissão do relatório.
    </div>

    <template v-else>
      <header data-testid="print-report-header" class="border-b-2 border-neutral-900 pb-4">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="font-mono text-xs font-bold tracking-widest text-neutral-600 uppercase">
              ESTRADA+ • LIVRO-CAIXA / CARNÊ-LEÃO TAC
            </p>
            <h1 class="mt-1 font-display text-2xl font-bold text-neutral-900 uppercase">
              Relatório Mensal Contábil — {{ dashboard.monthLabel }}
            </h1>
          </div>
          <div class="text-right font-mono text-xs text-neutral-700">
            <p>Competência: {{ dashboard.month }}</p>
            <p>RNTRC: {{ dashboard.driverProfile.rntrc }}</p>
          </div>
        </div>

        <dl
          class="mt-4 grid grid-cols-1 gap-2 border-t border-neutral-200 pt-3 text-xs sm:grid-cols-3"
        >
          <div>
            <dt class="font-mono text-neutral-500 uppercase">Motorista</dt>
            <dd class="font-semibold text-neutral-900">{{ dashboard.driverProfile.name }}</dd>
          </div>
          <div>
            <dt class="font-mono text-neutral-500 uppercase">Cavalo Mecânico</dt>
            <dd class="font-semibold text-neutral-900">
              {{ dashboard.driverProfile.vehicleModel }}
            </dd>
          </div>
          <div>
            <dt class="font-mono text-neutral-500 uppercase">Placas</dt>
            <dd class="font-mono font-semibold text-neutral-900">
              {{ dashboard.driverProfile.vehiclePlates }}
            </dd>
          </div>
        </dl>
      </header>

      <section data-testid="print-summary-section" class="space-y-3">
        <h2 class="font-display text-base font-bold text-neutral-900 uppercase">
          1. Resumo Operacional e Financeiro
        </h2>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div class="rounded-sm border border-neutral-300 p-3">
            <p class="font-mono text-[11px] text-neutral-600">KM RODADOS</p>
            <p class="font-mono text-lg font-bold text-neutral-900">
              {{ formatKm(dashboard.stats.kmDriven.totalKm) }}
            </p>
          </div>
          <div class="rounded-sm border border-neutral-300 p-3">
            <p class="font-mono text-[11px] text-neutral-600">MÉDIA DIESEL</p>
            <p class="font-mono text-lg font-bold text-neutral-900">
              {{ formatKmPerLiterFromMilli(toMilliKmL(dashboard.stats.dieselAverage.kmPerLiter)) }}
            </p>
          </div>
          <div class="rounded-sm border border-neutral-300 p-3">
            <p class="font-mono text-[11px] text-neutral-600">CUSTO MÉDIO / KM</p>
            <p class="font-mono text-lg font-bold text-neutral-900">
              {{ formatCurrencyFromCents(toCents(dashboard.hero.costPerKmReais)) }}
            </p>
          </div>
          <div class="rounded-sm border border-neutral-300 p-3">
            <p class="font-mono text-[11px] text-neutral-600">FRETES BRUTOS</p>
            <p class="font-mono text-lg font-bold text-neutral-900">
              {{ formatCurrencyFromCents(toCents(dashboard.stats.netMargin.grossFreightReais)) }}
            </p>
          </div>
          <div class="rounded-sm border border-neutral-300 p-3">
            <p class="font-mono text-[11px] text-neutral-600">TOTAL DESPESAS</p>
            <p class="font-mono text-lg font-bold text-neutral-900">
              {{ formatCurrencyFromCents(toCents(dashboard.stats.netMargin.totalExpensesReais)) }}
            </p>
          </div>
          <div class="rounded-sm border border-neutral-300 p-3">
            <p class="font-mono text-[11px] text-neutral-600">SOBRA LÍQUIDA</p>
            <p class="font-mono text-lg font-bold text-neutral-900">
              {{ formatCurrencyFromCents(toCents(dashboard.stats.netMargin.netMarginReais)) }}
              <span class="text-xs font-normal text-neutral-600">
                ({{ formatPercentPtBr(dashboard.stats.netMargin.marginPercent) }})
              </span>
            </p>
          </div>
        </div>
      </section>

      <section data-testid="print-trips-section" class="space-y-2">
        <h2 class="font-display text-base font-bold text-neutral-900 uppercase">
          2. Viagens Registradas ({{ trips.length }})
        </h2>
        <p v-if="trips.length === 0" class="font-mono text-xs text-neutral-600">
          Nenhuma viagem registrada nesta competência.
        </p>
        <table
          v-else
          data-testid="print-trips-table"
          class="w-full border-collapse text-left text-xs"
        >
          <thead>
            <tr class="border-b-2 border-neutral-900 font-mono text-[11px] text-neutral-700">
              <th scope="col" class="py-2 pr-2">DATA</th>
              <th scope="col" class="py-2 pr-2">NF-E</th>
              <th scope="col" class="py-2 pr-2">ROTA</th>
              <th scope="col" class="py-2 pr-2 text-right">DISTÂNCIA</th>
              <th scope="col" class="py-2 pr-2 text-right">MÉDIA</th>
              <th scope="col" class="py-2 text-right">FRETE BRUTO</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-200 font-mono">
            <tr v-for="trip in trips" :key="trip.id">
              <td class="py-1.5 pr-2">{{ formatDateBr(trip.tripDate) }}</td>
              <td class="py-1.5 pr-2">{{ trip.invoiceNumber ? `#${trip.invoiceNumber}` : '—' }}</td>
              <td class="py-1.5 pr-2 font-sans">{{ trip.origin }} &rarr; {{ trip.destination }}</td>
              <td class="py-1.5 pr-2 text-right">{{ formatKm(trip.distanceKm) }}</td>
              <td class="py-1.5 pr-2 text-right">
                {{ formatKmPerLiterFromMilli(toMilliKmL(trip.kmPerLiter)) }}
              </td>
              <td class="py-1.5 text-right font-semibold">
                {{ formatCurrencyFromCents(toCents(trip.freightValueReais)) }}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section data-testid="print-expenses-section" class="space-y-2">
        <h2 class="font-display text-base font-bold text-neutral-900 uppercase">
          3. Lançamentos de Despesas ({{ expenses.length }})
        </h2>
        <p v-if="expenses.length === 0" class="font-mono text-xs text-neutral-600">
          Nenhuma despesa registrada nesta competência.
        </p>
        <table
          v-else
          data-testid="print-expenses-table"
          class="w-full border-collapse text-left text-xs"
        >
          <thead>
            <tr class="border-b-2 border-neutral-900 font-mono text-[11px] text-neutral-700">
              <th scope="col" class="py-2 pr-2">DATA</th>
              <th scope="col" class="py-2 pr-2">CATEGORIA</th>
              <th scope="col" class="py-2 pr-2">DESCRIÇÃO</th>
              <th scope="col" class="py-2 pr-2">PAGAMENTO</th>
              <th scope="col" class="py-2 pr-2">COMPROVANTE</th>
              <th scope="col" class="py-2 text-right">VALOR</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-200 font-mono">
            <tr v-for="expense in expenses" :key="expense.id">
              <td class="py-1.5 pr-2">{{ formatDateBr(expense.expenseDate) }}</td>
              <td class="py-1.5 pr-2">{{ EXPENSE_CATEGORY_META[expense.category].badgeLabel }}</td>
              <td class="py-1.5 pr-2 font-sans">{{ expense.description }}</td>
              <td class="py-1.5 pr-2">
                {{ PAYMENT_METHOD_META[expense.paymentMethod].tableLabel }}
              </td>
              <td class="py-1.5 pr-2">{{ expense.receiptReference ?? 'Sem comprovante' }}</td>
              <td class="py-1.5 text-right font-semibold">
                {{ formatCurrencyFromCents(toCents(expense.amountReais)) }}
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </template>
  </div>
</template>
