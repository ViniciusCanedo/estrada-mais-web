import { and, count, eq, like, sql } from 'drizzle-orm'
import { getDatabase, type AppDatabase } from '../database/client'
import { expenses, trips } from '../database/schema'

export interface NavigationCounts {
  tripsCount: number
  expensesCount: number
}

export interface IHealthRepository {
  pingDatabase(): boolean
  getNavigationCounts(driverId: number, month?: string): NavigationCounts
}

/**
 * Repositório responsável pela verificação de conectividade SQLite e contadores da navegação.
 */
export class HealthRepository implements IHealthRepository {
  public constructor(private readonly database?: AppDatabase) {}

  private resolveDb(): AppDatabase {
    return this.database ?? getDatabase()
  }

  public pingDatabase(): boolean {
    try {
      const rows = this.resolveDb().all<{ ok: number }>(sql`SELECT 1 AS ok`)
      return rows.some((row) => row.ok === 1)
    } catch {
      return false
    }
  }

  public getNavigationCounts(driverId: number, month?: string): NavigationCounts {
    const db = this.resolveDb()
    const tripFilter = month
      ? and(eq(trips.driverId, driverId), like(trips.tripDate, `${month}-%`))
      : eq(trips.driverId, driverId)
    const expenseFilter = month
      ? and(eq(expenses.driverId, driverId), like(expenses.expenseDate, `${month}-%`))
      : eq(expenses.driverId, driverId)

    const tripsCount = db
      .select({ total: count() })
      .from(trips)
      .where(tripFilter)
      .all()
      .reduce((total, row) => total + row.total, 0)
    const expensesCount = db
      .select({ total: count() })
      .from(expenses)
      .where(expenseFilter)
      .all()
      .reduce((total, row) => total + row.total, 0)

    return {
      tripsCount,
      expensesCount,
    }
  }
}

export const healthRepository = new HealthRepository()
