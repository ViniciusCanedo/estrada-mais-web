import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { readBody } from 'h3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ExpenseDto } from '#shared/schemas/expense.schema'
import ExpenseFormModal from '~/components/expenses/ExpenseFormModal.vue'
import { useAuthSession } from '~/composables/useAuthSession'
import { useCompetencePeriod } from '~/composables/useCompetencePeriod'
import { useExpenses } from '~/composables/useExpenses'
import { useGlobalModals } from '~/composables/useGlobalModals'
import DefaultLayout from '~/layouts/default.vue'

let postFailMode = false
let lastCreatedBody: Record<string, unknown> | null = null
let lastUpdatedBody: Record<string, unknown> | null = null
let healthCalls = 0

const SAMPLE_EXPENSE: ExpenseDto = {
  id: 15,
  driverId: 1,
  tripId: null,
  isTripLinked: false,
  expenseDate: '2026-09-16',
  category: 'combustivel',
  description: 'Posto Graal KM 56',
  amountReais: 2400,
  fuelLiters: 500,
  pricePerLiterReais: 4.8,
  paymentMethod: 'cartao_frota',
  receiptReference: 'NF-e 8912',
  receiptBadgeType: 'fiscal',
  createdAt: '2026-09-16T12:00:00.000Z',
  updatedAt: '2026-09-16T12:00:00.000Z',
}

registerEndpoint('/api/auth/me', () => ({
  data: {
    id: 1,
    name: 'Valdir Silveira',
    email: 'valdir.silveira.truck@estrada.com.br',
    initials: 'VS',
    vehicleSummary: 'Scania R450 • 6x2',
  },
}))
registerEndpoint('/api/auth/logout', { method: 'POST', handler: () => ({ success: true }) })
registerEndpoint('/api/health', () => {
  healthCalls += 1
  return {
    status: 'ok',
    database: 'connected',
    timestamp: '2026-09-16T12:00:00.000Z',
    navigationCounts: { tripsCount: 5, expensesCount: 10 + healthCalls },
  }
})
registerEndpoint('/api/expenses', {
  method: 'POST',
  handler: async (event) => {
    if (postFailMode) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Erro ao salvar despesa no servidor.',
        data: { message: 'Erro ao salvar despesa no servidor.' },
      })
    }
    lastCreatedBody = await readBody<Record<string, unknown>>(event)
    return { data: { ...SAMPLE_EXPENSE, ...lastCreatedBody } }
  },
})
registerEndpoint('/api/expenses/15', {
  method: 'PUT',
  handler: async (event) => {
    lastUpdatedBody = await readBody<Record<string, unknown>>(event)
    return { data: { ...SAMPLE_EXPENSE, ...lastUpdatedBody } }
  },
})

function queryModal<T extends Element>(selector: string): T {
  const el = document.body.querySelector<T>(selector)
  if (!el) {
    throw new Error(`Elemento não encontrado no portal do modal: ${selector}`)
  }
  return el
}

async function setInputValue(selector: string, value: string): Promise<void> {
  const input = queryModal<HTMLInputElement>(selector)
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new Event('change', { bubbles: true }))
  await flushPromises()
}

async function setSelectValue(selector: string, value: string): Promise<void> {
  const select = queryModal<HTMLSelectElement>(selector)
  select.value = value
  select.dispatchEvent(new Event('change', { bubbles: true }))
  await flushPromises()
}

describe('ExpenseFormModal.vue e Modal Global de Despesas (Nuxt Runtime)', () => {
  beforeEach(() => {
    postFailMode = false
    lastCreatedBody = null
    lastUpdatedBody = null
    healthCalls = 0
    document.body.innerHTML = ''
    useCompetencePeriod().setMonth('2026-09')
    useGlobalModals().closeModals()
    useExpenses({ autoFetch: false }).clearEditingExpense()

    const auth = useAuthSession()
    auth.user.value = {
      id: 1,
      name: 'Valdir Silveira',
      email: 'valdir.silveira.truck@estrada.com.br',
      initials: 'VS',
      vehicleSummary: 'Scania R450 • 6x2',
    }
    auth.hasLoadedSession.value = true
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('deve exigir litros para combustível, limpar/desabilitar nas demais categorias e emitir payload válido', async () => {
    const wrapper = await mountSuspended(ExpenseFormModal, {
      props: {
        open: true,
        defaultDate: '2026-09-16',
      },
    })
    await flushPromises()

    expect(document.body.textContent).toContain('Lançar Nova Despesa')
    expect(queryModal<HTMLInputElement>('[data-testid="expense-liters-input"]').disabled).toBe(
      false,
    )

    await setInputValue('[data-testid="expense-description-input"]', 'Posto Graal Bandeirantes')
    await setInputValue('[data-testid="expense-amount-input"]', '2400')
    queryModal<HTMLFormElement>('[data-testid="modal-log-expense"] form').dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    )
    await vi.waitFor(() => {
      expect(document.body.textContent).toContain(
        'Informe a quantidade de litros para despesas de combustível.',
      )
    })
    expect(wrapper.emitted('submit')).toBeUndefined()

    await setInputValue('[data-testid="expense-liters-input"]', '500')
    expect(queryModal<HTMLInputElement>('[data-testid="expense-liters-input"]').value).toBe('500')

    await setInputValue('[data-testid="expense-liters-input"]', '')
    await setInputValue('[data-testid="expense-amount-input"]', '')
    await setInputValue('[data-testid="expense-amount-input"]', '2400')

    await setSelectValue('[data-testid="expense-category-select"]', 'manutencao')
    expect(queryModal<HTMLInputElement>('[data-testid="expense-liters-input"]').disabled).toBe(true)
    expect(queryModal<HTMLInputElement>('[data-testid="expense-liters-input"]').value).toBe('')

    await setSelectValue('[data-testid="expense-category-select"]', 'combustivel')
    expect(queryModal<HTMLInputElement>('[data-testid="expense-liters-input"]').disabled).toBe(
      false,
    )
    await setInputValue('[data-testid="expense-liters-input"]', '500')
    await setInputValue('[data-testid="expense-receipt-input"]', 'NF-e 8912')

    queryModal<HTMLFormElement>('[data-testid="modal-log-expense"] form').dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    )

    await vi.waitFor(() => {
      expect(wrapper.emitted('submit')).toHaveLength(1)
    })
    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      category: 'combustivel',
      expenseDate: '2026-09-16',
      description: 'Posto Graal Bandeirantes',
      fuelLiters: 500,
      amountReais: 2400,
      paymentMethod: 'cartao_frota',
      receiptReference: 'NF-e 8912',
    })

    queryModal<HTMLButtonElement>('[data-testid="expense-cancel-btn"]').click()
    await flushPromises()
    expect(wrapper.emitted('update:open')?.some(([val]) => val === false)).toBe(true)

    wrapper.unmount()

    const editNonFuelWrapper = await mountSuspended(ExpenseFormModal, {
      props: {
        open: true,
        defaultDate: '2026-10-01',
        editingExpense: {
          ...SAMPLE_EXPENSE,
          id: 22,
          category: 'outros',
          fuelLiters: null,
          pricePerLiterReais: null,
          receiptReference: null,
          receiptBadgeType: 'simple',
        },
      },
    })
    await flushPromises()
    expect(document.body.textContent).toContain('Editar Despesa')
    expect(queryModal<HTMLInputElement>('[data-testid="expense-liters-input"]').disabled).toBe(true)
    queryModal<HTMLFormElement>('[data-testid="modal-log-expense"] form').dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    )
    await vi.waitFor(() => {
      expect(editNonFuelWrapper.emitted('submit')).toHaveLength(1)
    })
    expect(editNonFuelWrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      category: 'outros',
      fuelLiters: null,
    })
    editNonFuelWrapper.unmount()
  })

  it('deve integrar criação, erro e edição de despesa pelo modal global no DefaultLayout', async () => {
    const layoutWrapper = await mountSuspended(DefaultLayout, {
      slots: {
        default: () => 'Conteúdo',
      },
    })
    await flushPromises()

    await layoutWrapper.find('[data-testid="open-expense-modal-btn"]').trigger('click')
    await flushPromises()
    expect(document.body.textContent).toContain('Lançar Nova Despesa')

    postFailMode = true
    await setInputValue('[data-testid="expense-description-input"]', 'Posto Teste Erro')
    await setInputValue('[data-testid="expense-liters-input"]', '250')
    await setInputValue('[data-testid="expense-amount-input"]', '1200')
    queryModal<HTMLFormElement>('[data-testid="modal-log-expense"] form').dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    )

    await vi.waitFor(() => {
      expect(queryModal('[data-testid="expense-modal-error"]').textContent).toContain(
        'Erro ao salvar despesa no servidor.',
      )
    })
    expect(useGlobalModals().isExpenseModalOpen.value).toBe(true)

    postFailMode = false
    queryModal<HTMLFormElement>('[data-testid="modal-log-expense"] form').dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    )
    await vi.waitFor(() => {
      expect(useGlobalModals().isExpenseModalOpen.value).toBe(false)
    })
    expect(lastCreatedBody).toMatchObject({
      description: 'Posto Teste Erro',
      fuelLiters: 250,
      amountReais: 1200,
    })

    useExpenses({ autoFetch: false }).openEditExpenseModal(SAMPLE_EXPENSE)
    await flushPromises()
    expect(document.body.textContent).toContain('Editar Despesa')

    await setSelectValue('[data-testid="expense-category-select"]', 'borracharia')
    await setInputValue('[data-testid="expense-amount-input"]', '180')
    queryModal<HTMLFormElement>('[data-testid="modal-log-expense"] form').dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    )
    await vi.waitFor(() => {
      expect(useGlobalModals().isExpenseModalOpen.value).toBe(false)
    })
    expect(lastUpdatedBody).toMatchObject({
      category: 'borracharia',
      fuelLiters: null,
      amountReais: 180,
    })

    useCompetencePeriod().setMonth('2026-10')
    await flushPromises()
    await useExpenses({ autoFetch: false }).refresh()

    layoutWrapper.unmount()
  })
})
