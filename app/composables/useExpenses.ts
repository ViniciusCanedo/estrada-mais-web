import type { NuxtError } from '#app'
import {
  computed,
  getCurrentInstance,
  onServerPrefetch,
  ref,
  watch,
  type ComputedRef,
  type Ref,
} from 'vue'
import type {
  ExpenseDto,
  ExpenseFilterCategory,
  ExpenseListResponse,
  ExpenseListSummary,
  ExpensePayloadInput,
} from '#shared/schemas/expense.schema'
import type { ApiItemResponse, ApiSuccessResponse } from '#shared/types/domain'
import { EMPTY_EXPENSE_SUMMARY } from '../utils/expenses'
import { useApiFetch } from './useApiFetch'
import { extractAuthErrorMessage } from './useAuthSession'
import { useCompetencePeriod } from './useCompetencePeriod'
import {
  consumeDirtyCacheFlag,
  DASHBOARD_CACHE_KEY,
  DASHBOARD_DIRTY_STATE_KEY,
} from './useDashboard'
import { useGlobalModals } from './useGlobalModals'
import { useTelemetrySync } from './useTelemetrySync'

export const EXPENSES_CACHE_KEY = 'expenses-ledger'
export const EXPENSES_DIRTY_STATE_KEY = 'estrada-expenses-dirty'

export interface UseExpensesOptions {
  autoFetch?: boolean
}

export interface ExpensesState {
  expenses: ComputedRef<ExpenseDto[]>
  summary: ComputedRef<ExpenseListSummary>
  activeCategory: Ref<ExpenseFilterCategory>
  editingExpense: Ref<ExpenseDto | null>
  pending: ComputedRef<boolean>
  mutating: Ref<boolean>
  deletingId: Ref<number | null>
  mutationError: Ref<string | null>
  error: Ref<NuxtError<unknown> | undefined>
  setCategory: (category: ExpenseFilterCategory) => void
  refresh: () => Promise<void>
  openCreateExpenseModal: () => void
  openEditExpenseModal: (expense: ExpenseDto) => void
  clearEditingExpense: () => void
  createExpense: (payload: ExpensePayloadInput) => Promise<ExpenseDto>
  updateExpense: (id: number, payload: ExpensePayloadInput) => Promise<ExpenseDto>
  deleteExpense: (id: number) => Promise<void>
}

interface ExpensesSharedRefs {
  activeCategory: Ref<ExpenseFilterCategory>
  editingExpense: Ref<ExpenseDto | null>
  mutating: Ref<boolean>
  deletingId: Ref<number | null>
  mutationError: Ref<string | null>
}

function useExpensesSharedRefs(): ExpensesSharedRefs {
  return {
    activeCategory: useState<ExpenseFilterCategory>('estrada-expenses-category', () => 'todas'),
    editingExpense: useState<ExpenseDto | null>('estrada-expenses-editing', () => null),
    mutating: useState<boolean>('estrada-expenses-mutating', () => false),
    deletingId: useState<number | null>('estrada-expenses-deleting-id', () => null),
    mutationError: useState<string | null>('estrada-expenses-mutation-error', () => null),
  }
}

async function refreshLedgerAndSidebar(refreshSync: () => Promise<void>): Promise<void> {
  if (typeof useState === 'function') {
    useState<boolean>(DASHBOARD_DIRTY_STATE_KEY, () => false).value = true
  }
  const tasks: Promise<unknown>[] = [refreshSync()]
  if (typeof refreshNuxtData === 'function') {
    tasks.push(refreshNuxtData(EXPENSES_CACHE_KEY), refreshNuxtData(DASHBOARD_CACHE_KEY))
  }
  await Promise.all(tasks)
}

async function runExpenseMutation<T>(options: {
  mutationError: Ref<string | null>
  refreshSync: () => Promise<void>
  fallbackMessage: string
  operation: () => Promise<T>
  onPendingChange: (isPending: boolean) => void
}): Promise<T> {
  options.onPendingChange(true)
  options.mutationError.value = null
  try {
    const result = await options.operation()
    await refreshLedgerAndSidebar(options.refreshSync)
    return result
  } catch (caught: unknown) {
    options.mutationError.value = extractAuthErrorMessage(caught, options.fallbackMessage)
    throw caught
  } finally {
    options.onPendingChange(false)
  }
}

function executeExpenseSave<T>(
  refs: ExpensesSharedRefs,
  refreshSync: () => Promise<void>,
  operation: () => Promise<T>,
): Promise<T> {
  return runExpenseMutation({
    mutationError: refs.mutationError,
    refreshSync,
    fallbackMessage: 'Não foi possível salvar a despesa.',
    onPendingChange: (pending) => {
      refs.mutating.value = pending
    },
    operation,
  })
}

function createExpenseActions(
  refs: ExpensesSharedRefs,
  refreshSync: () => Promise<void>,
): Pick<ExpensesState, 'createExpense' | 'updateExpense' | 'deleteExpense'> {
  function createExpense(payload: ExpensePayloadInput): Promise<ExpenseDto> {
    return executeExpenseSave(refs, refreshSync, async () => {
      const res = await $fetch<ApiItemResponse<ExpenseDto>>('/api/expenses', {
        method: 'POST',
        body: payload,
      })
      return res.data
    })
  }

  function updateExpense(id: number, payload: ExpensePayloadInput): Promise<ExpenseDto> {
    return executeExpenseSave(refs, refreshSync, async () => {
      const res = await $fetch<ApiItemResponse<ExpenseDto>>(`/api/expenses/${id}`, {
        method: 'PUT',
        body: payload,
      })
      return res.data
    })
  }

  function deleteExpense(id: number): Promise<void> {
    return runExpenseMutation({
      mutationError: refs.mutationError,
      refreshSync,
      fallbackMessage: 'Não foi possível excluir a despesa.',
      onPendingChange: (pending) => {
        refs.deletingId.value = pending ? id : null
      },
      operation: async () => {
        await $fetch<ApiSuccessResponse>(`/api/expenses/${id}`, { method: 'DELETE' })
      },
    })
  }

  return { createExpense, updateExpense, deleteExpense }
}

function useExpensesFetch(
  autoFetch: boolean,
  selectedMonth: Ref<string>,
  activeCategory: Ref<ExpenseFilterCategory>,
) {
  if (!autoFetch) {
    return {
      expenses: computed(() => [] as ExpenseDto[]),
      summary: computed(() => EMPTY_EXPENSE_SUMMARY),
      pending: computed(() => false),
      error: ref<NuxtError<unknown> | undefined>(undefined),
      refresh: async (): Promise<void> => {
        if (typeof refreshNuxtData === 'function') {
          await refreshNuxtData(EXPENSES_CACHE_KEY)
        }
      },
    }
  }

  const expensesDirty = consumeDirtyCacheFlag(EXPENSES_DIRTY_STATE_KEY, EXPENSES_CACHE_KEY)

  const asyncData = useApiFetch<ExpenseListResponse>('/expenses', {
    key: EXPENSES_CACHE_KEY,
    query: computed(() => ({
      month: selectedMonth.value,
      category: activeCategory.value,
    })),
  })

  if (getCurrentInstance()) {
    onServerPrefetch(async () => {
      await asyncData
    })
  }

  watch(asyncData.data, () => {
    expensesDirty.value = false
  })

  return {
    expenses: computed(() => asyncData.data.value?.data ?? []),
    summary: computed(() => asyncData.data.value?.meta ?? EMPTY_EXPENSE_SUMMARY),
    pending: computed(() => asyncData.status.value === 'pending'),
    error: asyncData.error,
    refresh: async (): Promise<void> => {
      await asyncData.refresh()
    },
  }
}

/**
 * Gerencia o Ledger de Despesas sincronizado com competência mensal, modais globais e Sidebar.
 */
export function useExpenses(options: UseExpensesOptions = {}): ExpensesState {
  const { selectedMonth } = useCompetencePeriod()
  const { openExpenseModal } = useGlobalModals()
  const { refreshSync } = useTelemetrySync()
  const refs = useExpensesSharedRefs()
  const fetchState = useExpensesFetch(options.autoFetch ?? true, selectedMonth, refs.activeCategory)
  const actions = createExpenseActions(refs, refreshSync)

  function setCategory(category: ExpenseFilterCategory): void {
    refs.activeCategory.value = category
  }

  function openCreateExpenseModal(): void {
    refs.editingExpense.value = null
    refs.mutationError.value = null
    openExpenseModal()
  }

  function openEditExpenseModal(expense: ExpenseDto): void {
    refs.editingExpense.value = expense
    refs.mutationError.value = null
    openExpenseModal()
  }

  function clearEditingExpense(): void {
    refs.editingExpense.value = null
    refs.mutationError.value = null
  }

  return {
    ...fetchState,
    ...actions,
    activeCategory: refs.activeCategory,
    editingExpense: refs.editingExpense,
    mutating: refs.mutating,
    deletingId: refs.deletingId,
    mutationError: refs.mutationError,
    setCategory,
    openCreateExpenseModal,
    openEditExpenseModal,
    clearEditingExpense,
  }
}
