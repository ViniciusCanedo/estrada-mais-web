import { and, count, desc, eq, like, type SQL } from 'drizzle-orm'
import type { ExpenseCategory, ExpenseCategoryCounts } from '../../shared/schemas/expense.schema'
import { getDatabase, type AppDatabase } from '../database/client'
import { expenses, type ExpenseRow, type NewExpenseRow } from '../database/schema'

export interface IExpenseRepository {
  findManyByDriverAndMonth(
    driverId: number,
    month?: string,
    category?: ExpenseCategory,
  ): ExpenseRow[]
  countByCategoryInMonth(driverId: number, month?: string): ExpenseCategoryCounts
  findByIdAndDriver(id: number, driverId: number): ExpenseRow | undefined
  create(data: NewExpenseRow): ExpenseRow
  update(id: number, driverId: number, data: Partial<NewExpenseRow>): ExpenseRow | undefined
  deleteByIdAndDriver(id: number, driverId: number): boolean
}

function createEmptyCategoryCounts(): ExpenseCategoryCounts {
  return {
    todas: 0,
    combustivel: 0,
    pedagio: 0,
    borracharia: 0,
    manutencao: 0,
    alimentacao: 0,
    outros: 0,
  }
}

function buildDriverMonthConditions(driverId: number, month?: string): SQL[] {
  const conditions: SQL[] = [eq(expenses.driverId, driverId)]
  if (month) {
    conditions.push(like(expenses.expenseDate, `${month}-%`))
  }
  return conditions
}

/**
 * Repositório Drizzle ORM responsável pela persistência e filtragem do Ledger de Despesas no SQLite.
 */
export class ExpenseRepository implements IExpenseRepository {
  public constructor(private readonly database?: AppDatabase) {}

  private resolveDb(): AppDatabase {
    return this.database ?? getDatabase()
  }

  public findManyByDriverAndMonth(
    driverId: number,
    month?: string,
    category?: ExpenseCategory,
  ): ExpenseRow[] {
    const conditions = buildDriverMonthConditions(driverId, month)
    if (category) {
      conditions.push(eq(expenses.category, category))
    }

    return this.resolveDb()
      .select()
      .from(expenses)
      .where(and(...conditions))
      .orderBy(desc(expenses.expenseDate), desc(expenses.id))
      .all()
  }

  public countByCategoryInMonth(driverId: number, month?: string): ExpenseCategoryCounts {
    const conditions = buildDriverMonthConditions(driverId, month)
    const grouped = this.resolveDb()
      .select({
        category: expenses.category,
        total: count(),
      })
      .from(expenses)
      .where(and(...conditions))
      .groupBy(expenses.category)
      .all()

    const counts = createEmptyCategoryCounts()
    for (const row of grouped) {
      counts[row.category] = row.total
      counts.todas += row.total
    }

    return counts
  }

  public findByIdAndDriver(id: number, driverId: number): ExpenseRow | undefined {
    return this.resolveDb()
      .select()
      .from(expenses)
      .where(and(eq(expenses.id, id), eq(expenses.driverId, driverId)))
      .get()
  }

  public create(data: NewExpenseRow): ExpenseRow {
    return this.resolveDb().insert(expenses).values(data).returning().get()
  }

  public update(
    id: number,
    driverId: number,
    data: Partial<NewExpenseRow>,
  ): ExpenseRow | undefined {
    return this.resolveDb()
      .update(expenses)
      .set(data)
      .where(and(eq(expenses.id, id), eq(expenses.driverId, driverId)))
      .returning()
      .get()
  }

  public deleteByIdAndDriver(id: number, driverId: number): boolean {
    const deleted = this.resolveDb()
      .delete(expenses)
      .where(and(eq(expenses.id, id), eq(expenses.driverId, driverId)))
      .returning({ id: expenses.id })
      .get()

    return Boolean(deleted)
  }
}

export const expenseRepository = new ExpenseRepository()
