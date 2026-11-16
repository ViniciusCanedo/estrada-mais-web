import { and, count, desc, eq, like, sql } from 'drizzle-orm'
import type { ExpenseCategory } from '../../shared/types/domain'
import { getDatabase, type AppDatabase } from '../database/client'
import { expenses, trips, type ExpenseRow, type TripRow } from '../database/schema'

export interface MonthlyRawAggregates {
  month: string
  totalDistanceKm: number
  totalTripFuelDeciliters: number
  totalGrossFreightCents: number
  tripsCount: number
  expensesByCategoryCents: Record<ExpenseCategory, number>
  expensesCountByCategory: Record<ExpenseCategory, number>
  totalExpenseFuelDeciliters: number
  lastTireShopDescription: string | null
  lastMaintenanceDescription: string | null
}

export interface IReportRepository {
  getMonthlyAggregates(driverId: number, month: string): MonthlyRawAggregates
  getSixMonthsAggregates(driverId: number, months: string[]): MonthlyRawAggregates[]
  listTripsForMonth(driverId: number, month: string): TripRow[]
  listExpensesForMonth(driverId: number, month: string): ExpenseRow[]
}

function createEmptyCategoryRecord(): Record<ExpenseCategory, number> {
  return {
    combustivel: 0,
    pedagio: 0,
    borracharia: 0,
    manutencao: 0,
    alimentacao: 0,
    outros: 0,
  }
}

function findLastExpenseDescription(
  db: AppDatabase,
  driverId: number,
  month: string,
  category: ExpenseCategory,
): string | null {
  const row = db
    .select({ description: expenses.description })
    .from(expenses)
    .where(
      and(
        eq(expenses.driverId, driverId),
        eq(expenses.category, category),
        like(expenses.expenseDate, `${month}-%`),
      ),
    )
    .orderBy(desc(expenses.expenseDate), desc(expenses.id))
    .limit(1)
    .get()

  return row?.description ?? null
}

function queryExpenseAggregates(
  db: AppDatabase,
  driverId: number,
  month: string,
): {
  expensesByCategoryCents: Record<ExpenseCategory, number>
  expensesCountByCategory: Record<ExpenseCategory, number>
  totalExpenseFuelDeciliters: number
} {
  const grouped = db
    .select({
      category: expenses.category,
      totalAmountCents: sql<number>`coalesce(sum(${expenses.amountCents}), 0)`,
      totalCount: count(),
      totalFuelDeciliters: sql<number>`coalesce(sum(${expenses.fuelLitersDeciliters}), 0)`,
    })
    .from(expenses)
    .where(and(eq(expenses.driverId, driverId), like(expenses.expenseDate, `${month}-%`)))
    .groupBy(expenses.category)
    .all()

  const expensesByCategoryCents = createEmptyCategoryRecord()
  const expensesCountByCategory = createEmptyCategoryRecord()
  let totalExpenseFuelDeciliters = 0

  for (const row of grouped) {
    expensesByCategoryCents[row.category] = Number(row.totalAmountCents)
    expensesCountByCategory[row.category] = Number(row.totalCount)
    if (row.category === 'combustivel') {
      totalExpenseFuelDeciliters += Number(row.totalFuelDeciliters)
    }
  }

  return {
    expensesByCategoryCents,
    expensesCountByCategory,
    totalExpenseFuelDeciliters,
  }
}

/**
 * Repositório Drizzle ORM para consolidação mensal de telemetria, custos e listagens de relatórios.
 */
export class ReportRepository implements IReportRepository {
  public constructor(private readonly database?: AppDatabase) {}

  private resolveDb(): AppDatabase {
    return this.database ?? getDatabase()
  }

  public getMonthlyAggregates(driverId: number, month: string): MonthlyRawAggregates {
    const db = this.resolveDb()
    const tripSummary = db
      .select({
        totalDistanceKm: sql<number>`coalesce(sum(${trips.distanceKm}), 0)`,
        totalTripFuelDeciliters: sql<number>`coalesce(sum(${trips.fuelLitersDeciliters}), 0)`,
        totalGrossFreightCents: sql<number>`coalesce(sum(${trips.freightValueCents}), 0)`,
        tripsCount: count(),
      })
      .from(trips)
      .where(and(eq(trips.driverId, driverId), like(trips.tripDate, `${month}-%`)))
      .get()

    const expenseAgg = queryExpenseAggregates(db, driverId, month)

    return {
      month,
      totalDistanceKm: Number(tripSummary?.totalDistanceKm ?? 0),
      totalTripFuelDeciliters: Number(tripSummary?.totalTripFuelDeciliters ?? 0),
      totalGrossFreightCents: Number(tripSummary?.totalGrossFreightCents ?? 0),
      tripsCount: Number(tripSummary?.tripsCount ?? 0),
      ...expenseAgg,
      lastTireShopDescription: findLastExpenseDescription(db, driverId, month, 'borracharia'),
      lastMaintenanceDescription: findLastExpenseDescription(db, driverId, month, 'manutencao'),
    }
  }

  public getSixMonthsAggregates(driverId: number, months: string[]): MonthlyRawAggregates[] {
    return months.map((month) => this.getMonthlyAggregates(driverId, month))
  }

  public listTripsForMonth(driverId: number, month: string): TripRow[] {
    return this.resolveDb()
      .select()
      .from(trips)
      .where(and(eq(trips.driverId, driverId), like(trips.tripDate, `${month}-%`)))
      .orderBy(desc(trips.tripDate), desc(trips.id))
      .all()
  }

  public listExpensesForMonth(driverId: number, month: string): ExpenseRow[] {
    return this.resolveDb()
      .select()
      .from(expenses)
      .where(and(eq(expenses.driverId, driverId), like(expenses.expenseDate, `${month}-%`)))
      .orderBy(desc(expenses.expenseDate), desc(expenses.id))
      .all()
  }
}

export const reportRepository = new ReportRepository()
