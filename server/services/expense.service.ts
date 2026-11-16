import {
  expenseDtoSchema,
  expenseListSummarySchema,
  type ExpenseDto,
  type ExpenseFilterQuery,
  type ExpenseListResponse,
  type ExpensePayloadInput,
  type ReceiptBadgeType,
} from '../../shared/schemas/expense.schema'
import { fromCents, fromDeciliters, toCents, toDeciliters } from '../../shared/utils/units'
import type { ExpenseRow } from '../database/schema'
import { expenseRepository, type IExpenseRepository } from '../repositories/expense.repository'
import { DomainError } from '../utils/domain-error'

export const EXPENSE_NOT_FOUND_MESSAGE = 'Despesa não encontrada.'
export const FUEL_LITERS_REQUIRED_MESSAGE =
  'Informe a quantidade de litros para despesas de combustível.'

const FISCAL_RECEIPT_PATTERN = /^(NF-e|Extrato)/i

export interface ExpenseServiceDependencies {
  expenseRepo?: IExpenseRepository
}

export interface IExpenseService {
  listExpenses(driverId: number, query: ExpenseFilterQuery): ExpenseListResponse
  createExpense(driverId: number, input: ExpensePayloadInput): ExpenseDto
  updateExpense(driverId: number, expenseId: number, input: ExpensePayloadInput): ExpenseDto
  deleteExpense(driverId: number, expenseId: number): void
}

/**
 * Classifica o comprovante como fiscal ('NF-e'/'Extrato') ou simples (RN-EXP-04).
 */
export function classifyReceiptBadge(receiptReference: string | null): ReceiptBadgeType {
  if (!receiptReference) {
    return 'simple'
  }
  return FISCAL_RECEIPT_PATTERN.test(receiptReference.trim()) ? 'fiscal' : 'simple'
}

function normalizeReceiptReference(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? ''
  return trimmed.length > 0 ? trimmed : null
}

function resolveFuelLitersDeciliters(input: ExpensePayloadInput): number | null {
  if (input.category !== 'combustivel') {
    return null
  }
  if (typeof input.fuelLiters !== 'number' || input.fuelLiters <= 0) {
    throw new DomainError('VALIDATION_ERROR', FUEL_LITERS_REQUIRED_MESSAGE)
  }
  return toDeciliters(input.fuelLiters)
}

function buildPersistencePayload(input: ExpensePayloadInput) {
  return {
    expenseDate: input.expenseDate,
    category: input.category,
    description: input.description.trim(),
    amountCents: toCents(input.amountReais),
    fuelLitersDeciliters: resolveFuelLitersDeciliters(input),
    paymentMethod: input.paymentMethod,
    receiptReference: normalizeReceiptReference(input.receiptReference),
  }
}

function requireExpenseRow(row: ExpenseRow | undefined): ExpenseRow {
  if (!row) {
    throw new DomainError('NOT_FOUND', EXPENSE_NOT_FOUND_MESSAGE)
  }
  return row
}

function toExpenseDto(row: ExpenseRow): ExpenseDto {
  const amountReais = fromCents(row.amountCents)
  const fuelLiters =
    row.fuelLitersDeciliters !== null ? fromDeciliters(row.fuelLitersDeciliters) : null
  const pricePerLiterReais =
    row.category === 'combustivel' && fuelLiters !== null && fuelLiters > 0
      ? amountReais / fuelLiters
      : null

  return expenseDtoSchema.parse({
    id: row.id,
    driverId: row.driverId,
    tripId: row.tripId,
    isTripLinked: row.tripId !== null,
    expenseDate: row.expenseDate,
    category: row.category,
    description: row.description,
    amountReais,
    fuelLiters,
    pricePerLiterReais,
    paymentMethod: row.paymentMethod,
    receiptReference: row.receiptReference,
    receiptBadgeType: classifyReceiptBadge(row.receiptReference),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  })
}

/**
 * Serviço de regras de negócio do Diário Contábil de Despesas Operacionais (Ledger).
 */
export class ExpenseService implements IExpenseService {
  private readonly expenseRepo: IExpenseRepository

  public constructor(dependencies: ExpenseServiceDependencies = {}) {
    this.expenseRepo = dependencies.expenseRepo ?? expenseRepository
  }

  public listExpenses(driverId: number, query: ExpenseFilterQuery): ExpenseListResponse {
    const activeCategory = query.category === 'todas' ? undefined : query.category
    const rows = this.expenseRepo.findManyByDriverAndMonth(driverId, query.month, activeCategory)
    const countsByCategory = this.expenseRepo.countByCategoryInMonth(driverId, query.month)
    const totalAmountCents = rows.reduce((sum, row) => sum + row.amountCents, 0)

    return {
      data: rows.map(toExpenseDto),
      meta: expenseListSummarySchema.parse({
        totalCount: rows.length,
        totalAmountReais: fromCents(totalAmountCents),
        countsByCategory,
      }),
    }
  }

  public createExpense(driverId: number, input: ExpensePayloadInput): ExpenseDto {
    const nowIso = new Date().toISOString()
    const created = this.expenseRepo.create({
      driverId,
      tripId: null,
      ...buildPersistencePayload(input),
      createdAt: nowIso,
      updatedAt: nowIso,
    })

    return toExpenseDto(created)
  }

  public updateExpense(
    driverId: number,
    expenseId: number,
    input: ExpensePayloadInput,
  ): ExpenseDto {
    const updated = requireExpenseRow(
      this.expenseRepo.update(expenseId, driverId, {
        ...buildPersistencePayload(input),
        updatedAt: new Date().toISOString(),
      }),
    )

    return toExpenseDto(updated)
  }

  public deleteExpense(driverId: number, expenseId: number): void {
    const deleted = this.expenseRepo.deleteByIdAndDriver(expenseId, driverId)
    if (!deleted) {
      throw new DomainError('NOT_FOUND', EXPENSE_NOT_FOUND_MESSAGE)
    }
  }
}

export const expenseService = new ExpenseService()
