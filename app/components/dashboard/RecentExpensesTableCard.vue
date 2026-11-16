<script setup lang="ts">
import type { ExpenseDto } from '#shared/schemas/expense.schema'
import { toCents } from '#shared/utils/units'
import { EXPENSE_CATEGORY_META, getReceiptBadgeClass } from '~/utils/expenses'
import { formatCurrencyFromCents, formatShortDateBr } from '~/utils/formatters'
import RecentSectionCard from './RecentSectionCard.vue'

defineProps<{
  expenses: readonly ExpenseDto[]
  totalCount: number
}>()
</script>

<template>
  <RecentSectionCard
    card-test-id="recent-expenses-card"
    title="Últimas Despesas Operacionais"
    dot-class="bg-expense-blue"
    :view-all="{
      to: '/expenses',
      label: `Ver todas (${totalCount})`,
      className: 'text-expense-blue',
      testId: 'recent-expenses-view-all',
    }"
    :is-empty="expenses.length === 0"
    empty-text="Nenhuma despesa registrada nesta competência."
    empty-test-id="recent-expenses-empty"
  >
    <table class="w-full text-left text-xs">
      <thead>
        <tr class="border-b border-asphalt-border font-mono text-highway-muted">
          <th scope="col" class="pb-2 font-medium">DATA</th>
          <th scope="col" class="pb-2 font-medium">CATEGORIA</th>
          <th scope="col" class="pb-2 font-medium">ESTABELECIMENTO</th>
          <th scope="col" class="pb-2 text-right font-medium">VALOR</th>
          <th scope="col" class="pb-2 text-right font-medium">RECIBO</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-asphalt-border/60 font-mono">
        <tr
          v-for="expense in expenses"
          :key="expense.id"
          data-testid="recent-expense-row"
          class="transition-colors hover:bg-asphalt-bg/60"
        >
          <td class="py-2.5 text-highway-muted">
            {{ formatShortDateBr(expense.expenseDate) }}
          </td>
          <td class="py-2.5">
            <span
              class="rounded-sm border px-2 py-0.5 text-[10px] font-semibold"
              :class="EXPENSE_CATEGORY_META[expense.category].badgeClass"
            >
              {{ EXPENSE_CATEGORY_META[expense.category].badgeLabel }}
            </span>
          </td>
          <td class="max-w-44 truncate py-2.5 font-sans text-white">
            {{ expense.description }}
          </td>
          <td class="py-2.5 text-right font-bold text-white">
            {{ formatCurrencyFromCents(toCents(expense.amountReais)) }}
          </td>
          <td class="py-2.5 text-right">
            <span
              class="rounded-sm px-1.5 py-0.5 text-[10px]"
              :class="getReceiptBadgeClass(expense.receiptBadgeType)"
            >
              {{ expense.receiptReference ?? 'Sem comprovante' }}
            </span>
          </td>
        </tr>
      </tbody>
    </table>
  </RecentSectionCard>
</template>
