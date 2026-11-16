import type {
  ExpenseCategory,
  ExpenseCategoryCounts,
  ExpenseDto,
  ExpenseFilterCategory,
  ExpenseListSummary,
  ExpensePayloadInput,
  PaymentMethod,
  ReceiptBadgeType,
} from '#shared/schemas/expense.schema'

export interface ExpenseCategoryMeta {
  readonly value: ExpenseCategory
  readonly pillLabel: string
  readonly badgeLabel: string
  readonly formLabel: string
  readonly badgeClass: string
}

export interface ExpenseFilterOption {
  readonly value: ExpenseFilterCategory
  readonly pillLabel: string
}

export interface PaymentMethodMeta {
  readonly value: PaymentMethod
  readonly tableLabel: string
  readonly formLabel: string
}

export interface ExpenseFormState {
  category: ExpenseCategory
  expenseDate: string
  description: string
  fuelLiters: number | null
  amountReais: number | undefined
  paymentMethod: PaymentMethod
  receiptReference: string
}

export const EXPENSE_CATEGORY_META: Record<ExpenseCategory, ExpenseCategoryMeta> = {
  combustivel: {
    value: 'combustivel',
    pillLabel: 'Combustível',
    badgeLabel: 'COMBUSTÍVEL',
    formLabel: 'Combustível (Diesel S10 / Arla)',
    badgeClass: 'border-expense-blue/30 bg-expense-blue/20 text-expense-blue',
  },
  pedagio: {
    value: 'pedagio',
    pillLabel: 'Pedágios',
    badgeLabel: 'PEDÁGIO',
    formLabel: 'Pedágio / Recarga TAG',
    badgeClass: 'border-expense-blue/30 bg-expense-blue/20 text-expense-blue',
  },
  borracharia: {
    value: 'borracharia',
    pillLabel: 'Borracharia',
    badgeLabel: 'BORRACHARIA',
    formLabel: 'Borracharia & Pneus',
    badgeClass: 'border-asphalt-border bg-asphalt-border-light text-white',
  },
  manutencao: {
    value: 'manutencao',
    pillLabel: 'Manutenção',
    badgeLabel: 'MANUTENÇÃO',
    formLabel: 'Manutenção Mecânica / Peças',
    badgeClass: 'border-amber-default/30 bg-amber-default/20 text-amber-default',
  },
  alimentacao: {
    value: 'alimentacao',
    pillLabel: 'Alimentação',
    badgeLabel: 'ALIMENTAÇÃO',
    formLabel: 'Alimentação & Pernoite',
    badgeClass: 'border-asphalt-border bg-asphalt-surface-light text-highway-muted',
  },
  outros: {
    value: 'outros',
    pillLabel: 'Outras',
    badgeLabel: 'OUTRAS',
    formLabel: 'Outras Despesas',
    badgeClass: 'border-asphalt-border bg-asphalt-surface-light text-highway-muted',
  },
}

export const EXPENSE_CATEGORY_OPTIONS: readonly ExpenseCategoryMeta[] = [
  EXPENSE_CATEGORY_META.combustivel,
  EXPENSE_CATEGORY_META.pedagio,
  EXPENSE_CATEGORY_META.borracharia,
  EXPENSE_CATEGORY_META.manutencao,
  EXPENSE_CATEGORY_META.alimentacao,
  EXPENSE_CATEGORY_META.outros,
]

export const EXPENSE_FILTER_OPTIONS: readonly ExpenseFilterOption[] = [
  { value: 'todas', pillLabel: 'TODAS' },
  ...EXPENSE_CATEGORY_OPTIONS.map((item) => ({ value: item.value, pillLabel: item.pillLabel })),
]

export const PAYMENT_METHOD_META: Record<PaymentMethod, PaymentMethodMeta> = {
  cartao_frota: {
    value: 'cartao_frota',
    tableLabel: 'Cartão Frota',
    formLabel: 'Cartão Frota (Repom / Ticket Log / Sem Parar)',
  },
  cartao_debito: {
    value: 'cartao_debito',
    tableLabel: 'Cartão de Débito',
    formLabel: 'Cartão de Débito',
  },
  pix: {
    value: 'pix',
    tableLabel: 'PIX Direto',
    formLabel: 'PIX Direto',
  },
  dinheiro: {
    value: 'dinheiro',
    tableLabel: 'Dinheiro em Espécie',
    formLabel: 'Dinheiro em Espécie',
  },
  boleto: {
    value: 'boleto',
    tableLabel: 'Faturado / Boleto',
    formLabel: 'Faturado / Boleto',
  },
}

export const PAYMENT_METHOD_OPTIONS: readonly PaymentMethodMeta[] = [
  PAYMENT_METHOD_META.cartao_frota,
  PAYMENT_METHOD_META.cartao_debito,
  PAYMENT_METHOD_META.pix,
  PAYMENT_METHOD_META.dinheiro,
  PAYMENT_METHOD_META.boleto,
]

const EMPTY_EXPENSE_COUNTS: ExpenseCategoryCounts = {
  todas: 0,
  combustivel: 0,
  pedagio: 0,
  borracharia: 0,
  manutencao: 0,
  alimentacao: 0,
  outros: 0,
}

export const EMPTY_EXPENSE_SUMMARY: ExpenseListSummary = {
  totalCount: 0,
  totalAmountReais: 0,
  countsByCategory: EMPTY_EXPENSE_COUNTS,
}

/**
 * Retorna as classes Tailwind do badge de comprovante conforme RN-EXP-04.
 */
export function getReceiptBadgeClass(badgeType: ReceiptBadgeType): string {
  return badgeType === 'fiscal'
    ? 'border border-highway-green/20 bg-highway-green/10 text-highway-green'
    : 'border border-asphalt-border bg-asphalt-bg text-highway-muted'
}

/**
 * Define a data inicial padrão dentro do mês de competência selecionado ao abrir criação.
 */
export function resolveDefaultExpenseDate(month: string): string {
  return month === '2026-09' ? '2026-09-16' : `${month}-01`
}

/**
 * Constrói o estado reativo inicial do formulário de despesa para criação ou edição.
 */
export function buildExpenseFormState(
  editingExpense: ExpenseDto | null,
  defaultDate: string,
): ExpenseFormState {
  if (!editingExpense) {
    return {
      category: 'combustivel',
      expenseDate: defaultDate,
      description: '',
      fuelLiters: null,
      amountReais: undefined,
      paymentMethod: 'cartao_frota',
      receiptReference: '',
    }
  }

  return {
    category: editingExpense.category,
    expenseDate: editingExpense.expenseDate,
    description: editingExpense.description,
    fuelLiters: editingExpense.category === 'combustivel' ? editingExpense.fuelLiters : null,
    amountReais: editingExpense.amountReais,
    paymentMethod: editingExpense.paymentMethod,
    receiptReference: editingExpense.receiptReference ?? '',
  }
}

/**
 * Normaliza os campos validados do formulário antes de enviar à API (RN-EXP-02).
 */
export function normalizeExpensePayload(payload: ExpensePayloadInput): ExpensePayloadInput {
  return {
    ...payload,
    fuelLiters: payload.category === 'combustivel' ? (payload.fuelLiters ?? null) : null,
  }
}
