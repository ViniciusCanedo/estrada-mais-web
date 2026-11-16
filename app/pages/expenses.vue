<script setup lang="ts">
import type { ExpenseDto } from '#shared/schemas/expense.schema'
import ExpensesCategoryBar from '~/components/expenses/ExpensesCategoryBar.vue'
import ExpensesDataTable from '~/components/expenses/ExpensesDataTable.vue'
import { useCompetencePeriod } from '~/composables/useCompetencePeriod'
import { useExpenses } from '~/composables/useExpenses'

useHead({
  title: 'Despesas | Estrada+',
})

const toast = useToast()
const { formattedMonthLabel } = useCompetencePeriod()
const {
  expenses,
  summary,
  activeCategory,
  pending,
  deletingId,
  mutationError,
  error,
  setCategory,
  refresh,
  openCreateExpenseModal,
  openEditExpenseModal,
  deleteExpense,
} = useExpenses()

async function handleDeleteExpense(expense: ExpenseDto): Promise<void> {
  try {
    await deleteExpense(expense.id)
    toast.add({
      title: 'Despesa excluída do diário contábil.',
      color: 'success',
      icon: 'i-lucide-check-circle-2',
    })
  } catch {
    toast.add({
      title: mutationError.value ?? 'Não foi possível excluir a despesa.',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  }
}
</script>

<template>
  <div data-testid="screen-expenses" class="space-y-6">
    <div class="border-b border-asphalt-border pb-4">
      <span class="font-mono text-xs tracking-widest text-expense-blue uppercase">
        DIÁRIO CONTÁBIL OPERACIONAL • {{ formattedMonthLabel }}
      </span>
      <h1 class="mt-1 font-display text-3xl font-bold text-white uppercase">
        Despesas Operacionais
      </h1>
      <p class="mt-1 text-sm text-highway-muted">
        Controle categorizado de abastecimentos, pedágios, borracharia, manutenção e diárias.
      </p>
    </div>

    <ExpensesCategoryBar
      :active-category="activeCategory"
      :counts-by-category="summary.countsByCategory"
      @select-category="setCategory"
      @create="openCreateExpenseModal"
    />

    <div
      v-if="pending && expenses.length === 0"
      data-testid="expenses-loading-state"
      class="rounded-lg border border-asphalt-border bg-asphalt-surface p-6 font-mono text-sm text-highway-muted"
    >
      Carregando lançamentos de despesas...
    </div>

    <UAlert
      v-else-if="error && expenses.length === 0"
      color="error"
      variant="subtle"
      data-testid="expenses-error-state"
      title="Não foi possível carregar as despesas"
      description="Verifique sua sessão ou tente atualizar os lançamentos."
    >
      <template #actions>
        <UButton
          label="Tentar novamente"
          color="neutral"
          variant="outline"
          size="xs"
          data-testid="expenses-retry-btn"
          @click="refresh()"
        />
      </template>
    </UAlert>

    <div
      v-else-if="expenses.length === 0"
      data-testid="expenses-empty-state"
      class="space-y-3 rounded-lg border border-asphalt-border bg-asphalt-surface p-8 text-center"
    >
      <p class="font-mono text-sm text-highway-muted">
        Nenhuma despesa registrada para os filtros selecionados em {{ formattedMonthLabel }}.
      </p>
      <div>
        <UButton
          label="Lançar Primeira Despesa"
          icon="i-lucide-plus"
          color="secondary"
          variant="outline"
          data-testid="expenses-empty-create-btn"
          @click="openCreateExpenseModal"
        />
      </div>
    </div>

    <ExpensesDataTable
      v-else
      :expenses="expenses"
      :total-count="summary.totalCount"
      :total-amount-reais="summary.totalAmountReais"
      :deleting-id="deletingId"
      @edit="openEditExpenseModal"
      @delete="handleDeleteExpense"
    />
  </div>
</template>
