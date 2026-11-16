<script setup lang="ts">
import type { ExpenseCategoryCounts, ExpenseFilterCategory } from '#shared/schemas/expense.schema'
import { EXPENSE_FILTER_OPTIONS } from '../../utils/expenses'

defineProps<{
  activeCategory: ExpenseFilterCategory
  countsByCategory: ExpenseCategoryCounts
}>()

const emit = defineEmits<{
  selectCategory: [category: ExpenseFilterCategory]
  create: []
}>()
</script>

<template>
  <div
    data-testid="expenses-category-bar"
    class="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-asphalt-border bg-asphalt-surface p-4"
  >
    <div class="flex flex-wrap items-center gap-2">
      <span class="mr-2 font-mono text-xs text-highway-muted">CATEGORIA:</span>
      <button
        v-for="option in EXPENSE_FILTER_OPTIONS"
        :key="option.value"
        type="button"
        :aria-pressed="activeCategory === option.value"
        :data-testid="`expense-filter-${option.value}`"
        class="rounded-sm px-3 py-1 font-mono text-xs transition-colors"
        :class="
          activeCategory === option.value
            ? 'bg-expense-blue font-semibold text-asphalt-bg'
            : 'border border-asphalt-border bg-asphalt-bg text-highway-muted hover:text-white'
        "
        @click="emit('selectCategory', option.value)"
      >
        {{ option.pillLabel }} ({{ countsByCategory[option.value] }})
      </button>
    </div>

    <button
      type="button"
      data-testid="expenses-new-btn"
      class="rounded-sm bg-expense-blue px-4 py-1.5 font-display text-xs font-semibold tracking-wider text-asphalt-bg uppercase transition-colors hover:bg-expense-blue-dark"
      @click="emit('create')"
    >
      + Nova Despesa
    </button>
  </div>
</template>
