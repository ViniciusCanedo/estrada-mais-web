import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { getQuery } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ExpenseCategoryCounts, ExpenseDto } from '#shared/schemas/expense.schema'
import { useCompetencePeriod } from '~/composables/useCompetencePeriod'
import { useExpenses } from '~/composables/useExpenses'
import { useGlobalModals } from '~/composables/useGlobalModals'
import ExpensesPage from '~/pages/expenses.vue'

const BASE_EXPENSES: ExpenseDto[] = [
  {
    id: 1,
    driverId: 1,
    tripId: 10,
    isTripLinked: true,
    expenseDate: '2026-09-16',
    category: 'combustivel',
    description: 'Posto Graal Rodovia dos Bandeirantes KM 56',
    amountReais: 2400,
    fuelLiters: 500,
    pricePerLiterReais: 4.8,
    paymentMethod: 'cartao_frota',
    receiptReference: 'NF-e 8912',
    receiptBadgeType: 'fiscal',
    createdAt: '2026-09-16T12:00:00.000Z',
    updatedAt: '2026-09-16T12:00:00.000Z',
  },
  {
    id: 2,
    driverId: 1,
    tripId: null,
    isTripLinked: false,
    expenseDate: '2026-09-14',
    category: 'borracharia',
    description: 'Borracharia do Gaúcho - Reparo de válvula',
    amountReais: 180,
    fuelLiters: null,
    pricePerLiterReais: null,
    paymentMethod: 'pix',
    receiptReference: 'Recibo',
    receiptBadgeType: 'simple',
    createdAt: '2026-09-14T12:00:00.000Z',
    updatedAt: '2026-09-14T12:00:00.000Z',
  },
  {
    id: 3,
    driverId: 1,
    tripId: null,
    isTripLinked: false,
    expenseDate: '2026-09-12',
    category: 'manutencao',
    description: 'Scania Ribeirão - Filtro',
    amountReais: 840,
    fuelLiters: null,
    pricePerLiterReais: null,
    paymentMethod: 'cartao_debito',
    receiptReference: null,
    receiptBadgeType: 'simple',
    createdAt: '2026-09-12T12:00:00.000Z',
    updatedAt: '2026-09-12T12:00:00.000Z',
  },
]

let expensesList: ExpenseDto[] = []
let getMode: 'ok' | 'error' | 'empty' | 'delayed' = 'ok'
let deleteFailMode = false
let resolveDelayedGet: (() => void) | null = null

function computeCounts(items: ExpenseDto[]): ExpenseCategoryCounts {
  return {
    todas: items.length,
    combustivel: items.filter((item) => item.category === 'combustivel').length,
    pedagio: items.filter((item) => item.category === 'pedagio').length,
    borracharia: items.filter((item) => item.category === 'borracharia').length,
    manutencao: items.filter((item) => item.category === 'manutencao').length,
    alimentacao: items.filter((item) => item.category === 'alimentacao').length,
    outros: items.filter((item) => item.category === 'outros').length,
  }
}

registerEndpoint('/api/health', () => ({
  status: 'ok',
  database: 'connected',
  timestamp: '2026-09-16T12:00:00.000Z',
  navigationCounts: { tripsCount: 5, expensesCount: expensesList.length },
}))

registerEndpoint('/api/expenses', async (event) => {
  if (getMode === 'delayed') {
    await new Promise<void>((resolve) => {
      resolveDelayedGet = resolve
    })
  }
  if (getMode === 'error') {
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Erro ao carregar despesas.',
    })
  }
  if (getMode === 'empty') {
    return {
      data: [],
      meta: {
        totalCount: 0,
        totalAmountReais: 0,
        countsByCategory: computeCounts([]),
      },
    }
  }

  const query = getQuery(event)
  const category = typeof query.category === 'string' ? query.category : 'todas'
  const filtered =
    category === 'todas' ? expensesList : expensesList.filter((item) => item.category === category)

  return {
    data: filtered,
    meta: {
      totalCount: filtered.length,
      totalAmountReais: filtered.reduce((sum, item) => sum + item.amountReais, 0),
      countsByCategory: computeCounts(expensesList),
    },
  }
})

registerEndpoint('/api/expenses/2', {
  method: 'DELETE',
  handler: () => {
    if (deleteFailMode) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Not Found',
        message: 'Despesa não encontrada.',
        data: { message: 'Despesa não encontrada.' },
      })
    }
    expensesList = expensesList.filter((item) => item.id !== 2)
    return { success: true }
  },
})

describe('Página /expenses, ExpensesCategoryBar e ExpensesDataTable (Nuxt Runtime)', () => {
  beforeEach(() => {
    expensesList = [...BASE_EXPENSES]
    getMode = 'ok'
    deleteFailMode = false
    resolveDelayedGet = null
    clearNuxtData('expenses-ledger')
    useCompetencePeriod().setMonth('2026-09')
    useGlobalModals().closeModals()
    useExpenses({ autoFetch: false }).setCategory('todas')
    useExpenses({ autoFetch: false }).clearEditingExpense()
  })

  it('deve renderizar estados de carregamento, erro com tentativa e estado vazio', async () => {
    getMode = 'error'
    const errorWrapper = await mountSuspended(ExpensesPage)
    await vi.waitFor(() => {
      expect(errorWrapper.find('[data-testid="expenses-error-state"]').exists()).toBe(true)
    })

    getMode = 'ok'
    await errorWrapper.find('[data-testid="expenses-retry-btn"]').trigger('click')
    await vi.waitFor(() => {
      expect(errorWrapper.find('[data-testid="expenses-table"]').exists()).toBe(true)
    })

    clearNuxtData('expenses-ledger')
    getMode = 'empty'
    const emptyWrapper = await mountSuspended(ExpensesPage)
    await vi.waitFor(() => {
      expect(emptyWrapper.find('[data-testid="expenses-empty-state"]').exists()).toBe(true)
    })
    await emptyWrapper.find('[data-testid="expenses-empty-create-btn"]').trigger('click')
    expect(useGlobalModals().isExpenseModalOpen.value).toBe(true)

    clearNuxtData('expenses-ledger')
    getMode = 'delayed'
    const loadingWrapper = await mountSuspended(ExpensesPage)
    expect(loadingWrapper.find('[data-testid="expenses-loading-state"]').exists()).toBe(true)
    resolveDelayedGet?.()
    await flushPromises()
  })

  it('deve renderizar badges, formatar litros e preço/L, filtrar mantendo contadores e acionar edição/exclusão', async () => {
    const wrapper = await mountSuspended(ExpensesPage)
    await vi.waitFor(() => {
      expect(wrapper.find('[data-testid="expenses-table"]').exists()).toBe(true)
    })

    expect(wrapper.find('[data-testid="expense-filter-todas"]').text()).toBe('TODAS (3)')
    expect(wrapper.find('[data-testid="expense-filter-combustivel"]').text()).toBe(
      'Combustível (1)',
    )
    expect(wrapper.find('[data-testid="expense-filter-borracharia"]').text()).toBe(
      'Borracharia (1)',
    )
    expect(wrapper.find('[data-testid="expense-filter-manutencao"]').text()).toBe('Manutenção (1)')

    const fuelRow = wrapper.find('[data-testid="expense-row-1"]')
    expect(fuelRow.text()).toContain('16/09/2026')
    expect(fuelRow.text()).toContain('500,0 L')
    expect(fuelRow.text()).toContain('R$ 4,80')
    expect(fuelRow.text()).toContain('R$ 2.400,00')
    expect(fuelRow.text()).toContain('Cartão Frota')
    expect(fuelRow.find('[data-testid="expense-trip-linked-badge"]').text()).toContain('Viagem #10')
    expect(fuelRow.find('[data-testid="expense-receipt-1"]').classes()).toContain(
      'text-highway-green',
    )

    const tireRow = wrapper.find('[data-testid="expense-row-2"]')
    expect(tireRow.text()).toContain('PIX Direto')
    expect(tireRow.find('[data-testid="expense-receipt-2"]').classes()).toContain(
      'text-highway-muted',
    )
    expect(wrapper.find('[data-testid="expense-receipt-3"]').text()).toBe('Sem comprovante')

    await wrapper.find('[data-testid="expense-filter-combustivel"]').trigger('click')
    await vi.waitFor(() => {
      expect(wrapper.find('[data-testid="expense-row-2"]').exists()).toBe(false)
    })
    expect(wrapper.find('[data-testid="expense-row-1"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="expense-filter-todas"]').text()).toBe('TODAS (3)')
    expect(wrapper.find('[data-testid="expense-filter-borracharia"]').text()).toBe(
      'Borracharia (1)',
    )

    await wrapper.find('[data-testid="expense-filter-todas"]').trigger('click')
    await vi.waitFor(() => {
      expect(wrapper.find('[data-testid="expense-row-2"]').exists()).toBe(true)
    })

    await wrapper.find('[data-testid="edit-expense-1"]').trigger('click')
    expect(useGlobalModals().isExpenseModalOpen.value).toBe(true)
    expect(useExpenses({ autoFetch: false }).editingExpense.value?.id).toBe(1)

    deleteFailMode = true
    await wrapper.find('[data-testid="delete-expense-2"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="expense-row-2"]').exists()).toBe(true)

    deleteFailMode = false
    await wrapper.find('[data-testid="delete-expense-2"]').trigger('click')
    await vi.waitFor(() => {
      expect(wrapper.find('[data-testid="expense-row-2"]').exists()).toBe(false)
    })
    expect(wrapper.find('[data-testid="expense-filter-todas"]').text()).toBe('TODAS (2)')
  })
})
