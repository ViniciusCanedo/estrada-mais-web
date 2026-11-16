import { z } from 'zod'
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from '../types/domain'

export const EXPENSE_FILTER_CATEGORIES = ['todas', ...EXPENSE_CATEGORIES] as const
export const RECEIPT_BADGE_TYPES = ['fiscal', 'simple'] as const

/**
 * Schema compartilhado das categorias oficiais do Ledger de Despesas (RN-EXP-01).
 */
export const expenseCategorySchema = z.enum(EXPENSE_CATEGORIES, {
  error: 'Selecione uma categoria de despesa válida.',
})

/**
 * Schema compartilhado dos meios de pagamento aceitos no Ledger (RN-EXP-03).
 */
export const paymentMethodSchema = z.enum(PAYMENT_METHODS, {
  error: 'Selecione uma forma de pagamento válida.',
})

/**
 * Classificação visual de documento comprobatório exibida na tabela do Ledger (RN-EXP-04).
 */
export const receiptBadgeTypeSchema = z.enum(RECEIPT_BADGE_TYPES)

/**
 * Schema isomórfico para criação e edição de despesa operacional com litragem condicional (RN-EXP-02).
 */
export const expensePayloadSchema = z
  .object({
    category: expenseCategorySchema,
    expenseDate: z
      .string({ error: 'A data da despesa é obrigatória.' })
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe uma data válida no formato AAAA-MM-DD.'),
    description: z
      .string({ error: 'O estabelecimento ou descrição é obrigatório.' })
      .trim()
      .min(3, 'A descrição deve ter pelo menos 3 caracteres.')
      .max(160, 'A descrição deve ter no máximo 160 caracteres.'),
    fuelLiters: z
      .number({ error: 'Informe uma litragem válida.' })
      .finite('Informe uma litragem válida.')
      .positive('A litragem deve ser maior que zero.')
      .optional()
      .nullable(),
    amountReais: z
      .number({ error: 'O valor total pago é obrigatório.' })
      .finite('Informe um valor numérico válido.')
      .min(0.01, 'O valor da despesa deve ser maior que R$ 0,00.'),
    paymentMethod: paymentMethodSchema.default('cartao_frota'),
    receiptReference: z
      .string()
      .trim()
      .max(40, 'O número do comprovante/NF-e deve ter no máximo 40 caracteres.')
      .optional()
      .or(z.literal('')),
  })
  .refine(
    (data) =>
      data.category !== 'combustivel' ||
      (typeof data.fuelLiters === 'number' && data.fuelLiters > 0),
    {
      path: ['fuelLiters'],
      message: 'Informe a quantidade de litros para despesas de combustível.',
    },
  )

/**
 * Schema compartilhado para filtragem do Ledger por competência mensal e categoria (RN-EXP-06).
 */
export const expenseFilterQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Mês inválido.')
    .optional(),
  category: z.enum(EXPENSE_FILTER_CATEGORIES).default('todas'),
})

/**
 * Schema compartilhado para validação do parâmetro de rota `[id]` nas operações de despesa.
 */
export const expenseIdParamsSchema = z.object({
  id: z.coerce.number().int().positive('Identificador de despesa inválido.'),
})

/**
 * Contrato de representação de uma despesa operacional retornada pela API.
 */
export const expenseDtoSchema = z.object({
  id: z.number().int().positive(),
  driverId: z.number().int().positive(),
  tripId: z.number().int().positive().nullable(),
  isTripLinked: z.boolean(),
  expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category: expenseCategorySchema,
  description: z.string(),
  amountReais: z.number().positive(),
  fuelLiters: z.number().positive().nullable(),
  pricePerLiterReais: z.number().positive().nullable(),
  paymentMethod: paymentMethodSchema,
  receiptReference: z.string().nullable(),
  receiptBadgeType: receiptBadgeTypeSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
})

/**
 * Contadores por categoria na competência selecionada, incluindo o total geral `todas`.
 */
export const expenseCategoryCountsSchema = z.object({
  todas: z.number().int().nonnegative(),
  combustivel: z.number().int().nonnegative(),
  pedagio: z.number().int().nonnegative(),
  borracharia: z.number().int().nonnegative(),
  manutencao: z.number().int().nonnegative(),
  alimentacao: z.number().int().nonnegative(),
  outros: z.number().int().nonnegative(),
})

/**
 * Metadados agregados retornados por `GET /api/expenses`.
 */
export const expenseListSummarySchema = z.object({
  totalCount: z.number().int().nonnegative(),
  totalAmountReais: z.number().nonnegative(),
  countsByCategory: expenseCategoryCountsSchema,
})

export type ExpenseCategory = z.infer<typeof expenseCategorySchema>
export type ExpenseFilterCategory = (typeof EXPENSE_FILTER_CATEGORIES)[number]
export type PaymentMethod = z.infer<typeof paymentMethodSchema>
export type ReceiptBadgeType = z.infer<typeof receiptBadgeTypeSchema>
export type ExpensePayloadInput = z.infer<typeof expensePayloadSchema>
export type ExpenseFilterQuery = z.infer<typeof expenseFilterQuerySchema>
export type ExpenseIdParams = z.infer<typeof expenseIdParamsSchema>
export type ExpenseDto = z.infer<typeof expenseDtoSchema>
export type ExpenseCategoryCounts = z.infer<typeof expenseCategoryCountsSchema>
export type ExpenseListSummary = z.infer<typeof expenseListSummarySchema>

export interface ExpenseListResponse {
  data: ExpenseDto[]
  meta: ExpenseListSummary
}
