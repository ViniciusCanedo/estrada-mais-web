<script setup lang="ts">
import type { ExpenseDto } from '#shared/schemas/expense.schema'
import { toCents, toDeciliters } from '#shared/utils/units'
import {
  EXPENSE_CATEGORY_META,
  PAYMENT_METHOD_META,
  getReceiptBadgeClass,
} from '../../utils/expenses'
import {
  formatCurrencyFromCents,
  formatDateBr,
  formatLitersFromDeciliters,
} from '../../utils/formatters'

withDefaults(
  defineProps<{
    expenses: ExpenseDto[]
    totalCount: number
    totalAmountReais: number
    deletingId?: number | null
  }>(),
  {
    deletingId: null,
  },
)

const emit = defineEmits<{
  edit: [expense: ExpenseDto]
  delete: [expense: ExpenseDto]
}>()

function formatFuelLiters(liters: number | null): string {
  return liters !== null ? formatLitersFromDeciliters(toDeciliters(liters)) : '-'
}

function formatPricePerLiter(pricePerLiter: number | null): string {
  return pricePerLiter !== null ? formatCurrencyFromCents(toCents(pricePerLiter)) : '-'
}
</script>

<template>
  <div class="overflow-hidden rounded-lg border border-asphalt-border bg-asphalt-surface">
    <div class="overflow-x-auto">
      <table id="full-expenses-table" data-testid="expenses-table" class="w-full text-left text-xs">
        <thead>
          <tr
            class="border-b border-asphalt-border bg-asphalt-bg/80 font-mono text-[11px] text-highway-muted uppercase"
          >
            <th scope="col" class="px-4 py-3">DATA</th>
            <th scope="col" class="p-3">CATEGORIA</th>
            <th scope="col" class="px-4 py-3">ESTABELECIMENTO / DESCRIÇÃO</th>
            <th scope="col" class="p-3 text-right">LITROS</th>
            <th scope="col" class="p-3 text-right">PREÇO/L</th>
            <th scope="col" class="px-4 py-3 text-right">VALOR TOTAL</th>
            <th scope="col" class="p-3">PAGAMENTO</th>
            <th scope="col" class="p-3 text-center">COMPROVANTE</th>
            <th scope="col" class="px-4 py-3 text-center">AÇÕES</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-asphalt-border/60 font-mono">
          <tr
            v-for="expense in expenses"
            :key="expense.id"
            :data-testid="`expense-row-${expense.id}`"
            class="transition-colors hover:bg-asphalt-bg/80"
          >
            <td class="px-4 py-3 whitespace-nowrap text-highway-muted">
              {{ formatDateBr(expense.expenseDate) }}
            </td>
            <td class="p-3 whitespace-nowrap">
              <span
                class="inline-block rounded-sm border px-2 py-0.5 text-[10px] font-semibold"
                :class="EXPENSE_CATEGORY_META[expense.category].badgeClass"
              >
                {{ EXPENSE_CATEGORY_META[expense.category].badgeLabel }}
              </span>
            </td>
            <td class="px-4 py-3 font-sans font-medium text-white">
              <span>{{ expense.description }}</span>
              <span
                v-if="expense.isTripLinked"
                data-testid="expense-trip-linked-badge"
                class="ml-2 inline-flex items-center rounded-sm border border-amber-default/30 bg-amber-default/10 px-1.5 py-0.5 font-mono text-[10px] text-amber-default"
              >
                Viagem #{{ expense.tripId }}
              </span>
            </td>
            <td
              class="p-3 text-right whitespace-nowrap"
              :class="expense.fuelLiters !== null ? 'text-white' : 'text-highway-muted'"
            >
              {{ formatFuelLiters(expense.fuelLiters) }}
            </td>
            <td class="p-3 text-right whitespace-nowrap text-highway-muted">
              {{ formatPricePerLiter(expense.pricePerLiterReais) }}
            </td>
            <td class="px-4 py-3 text-right font-bold whitespace-nowrap text-white">
              {{ formatCurrencyFromCents(toCents(expense.amountReais)) }}
            </td>
            <td class="p-3 whitespace-nowrap text-highway-muted">
              {{ PAYMENT_METHOD_META[expense.paymentMethod].tableLabel }}
            </td>
            <td class="p-3 text-center whitespace-nowrap">
              <span
                :data-testid="`expense-receipt-${expense.id}`"
                class="rounded-sm px-1.5 py-0.5 font-mono text-[10px]"
                :class="getReceiptBadgeClass(expense.receiptBadgeType)"
              >
                {{ expense.receiptReference ?? 'Sem comprovante' }}
              </span>
            </td>
            <td class="px-4 py-3 text-center whitespace-nowrap">
              <div class="flex items-center justify-center gap-2 text-highway-muted">
                <button
                  type="button"
                  title="Editar"
                  :aria-label="`Editar despesa ${expense.description}`"
                  :data-testid="`edit-expense-${expense.id}`"
                  class="rounded-sm p-1 transition-colors hover:text-amber-default"
                  @click="emit('edit', expense)"
                >
                  <UIcon name="i-lucide-pencil" class="size-3.5" />
                </button>
                <button
                  type="button"
                  title="Excluir"
                  :aria-label="`Excluir despesa ${expense.description}`"
                  :data-testid="`delete-expense-${expense.id}`"
                  :disabled="deletingId === expense.id"
                  class="rounded-sm p-1 transition-colors hover:text-highway-red disabled:opacity-50"
                  @click="emit('delete', expense)"
                >
                  <UIcon name="i-lucide-trash-2" class="size-3.5" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      data-testid="expenses-table-summary"
      class="flex flex-wrap items-center justify-between gap-2 border-t border-asphalt-border bg-asphalt-bg/60 px-4 py-2.5 font-mono text-xs text-highway-muted"
    >
      <span>{{ totalCount }} lançamento(s) na visão atual</span>
      <span class="font-semibold text-white">
        Total filtrado: {{ formatCurrencyFromCents(toCents(totalAmountReais)) }}
      </span>
    </div>
  </div>
</template>
