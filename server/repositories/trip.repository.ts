import { and, asc, desc, eq, gte, lte, sql, type SQL } from 'drizzle-orm'
import type { AnySQLiteColumn } from 'drizzle-orm/sqlite-core'
import type { TripSortDirection, TripSortField } from '../../shared/schemas/trip.schema'
import { formatLocation, normalizeSearchText } from '../../shared/utils/telematics'
import { getDatabase, type AppDatabase } from '../database/client'
import {
  expenses,
  trips,
  type NewExpenseRow,
  type NewTripRow,
  type TripRow,
} from '../database/schema'

export interface ResolvedTripFilter {
  startDate?: string
  endDate?: string
  search?: string
  state: string
  sortBy: TripSortField
  sortDir: TripSortDirection
}

export type NewTripLinkedExpenseRow = Omit<NewExpenseRow, 'tripId'>

type DrizzleTx = Parameters<Parameters<AppDatabase['transaction']>[0]>[0]

export interface ITripRepository {
  findManyByFilter(driverId: number, filter: ResolvedTripFilter): TripRow[]
  findByIdAndDriver(id: number, driverId: number): TripRow | undefined
  listDistinctStates(driverId: number): string[]
  createWithLinkedExpenses(
    tripData: NewTripRow,
    linkedExpenses: readonly NewTripLinkedExpenseRow[],
  ): TripRow
  updateWithLinkedExpenses(
    id: number,
    driverId: number,
    tripData: Partial<NewTripRow>,
    linkedExpenses: readonly NewTripLinkedExpenseRow[],
  ): TripRow | undefined
  deleteByIdAndDriver(id: number, driverId: number): boolean
}

const SORT_EXPRESSIONS: Record<TripSortField, AnySQLiteColumn | SQL> = {
  tripDate: trips.tripDate,
  route: sql`${trips.originCity} || ', ' || ${trips.originState} || ' -> ' || ${trips.destinationCity} || ', ' || ${trips.destinationState}`,
  distanceKm: trips.distanceKm,
  kmPerLiter: sql`CAST(${trips.distanceKm} AS REAL) / ${trips.fuelLitersDeciliters}`,
  costPerKm: sql`CAST(${trips.fuelCostCents} + ${trips.tollCostCents} AS REAL) / ${trips.distanceKm}`,
}

function buildWhereConditions(driverId: number, filter: ResolvedTripFilter): SQL[] {
  const conditions: SQL[] = [eq(trips.driverId, driverId)]

  if (filter.startDate) {
    conditions.push(gte(trips.tripDate, filter.startDate))
  }
  if (filter.endDate) {
    conditions.push(lte(trips.tripDate, filter.endDate))
  }
  if (filter.state && filter.state !== 'TODOS') {
    conditions.push(
      sql`(${trips.originState} = ${filter.state} OR ${trips.destinationState} = ${filter.state})`,
    )
  }

  return conditions
}

function matchesTripSearch(row: TripRow, rawSearch: string): boolean {
  const normalizedQuery = normalizeSearchText(rawSearch)
  const cleanInvoiceQuery = normalizedQuery.startsWith('#')
    ? normalizedQuery.slice(1)
    : normalizedQuery

  const originText = normalizeSearchText(formatLocation(row.originCity, row.originState))
  const destinationText = normalizeSearchText(
    formatLocation(row.destinationCity, row.destinationState),
  )
  const invoiceText = row.invoiceNumber ? normalizeSearchText(row.invoiceNumber) : ''

  return (
    originText.includes(normalizedQuery) ||
    destinationText.includes(normalizedQuery) ||
    (cleanInvoiceQuery.length > 0 && invoiceText.includes(cleanInvoiceQuery))
  )
}

function syncLinkedExpensesInTx(
  tx: DrizzleTx,
  tripId: number,
  driverId: number,
  desiredExpenses: readonly NewTripLinkedExpenseRow[],
): void {
  const existingRows = tx
    .select()
    .from(expenses)
    .where(and(eq(expenses.tripId, tripId), eq(expenses.driverId, driverId)))
    .all()

  const desiredByCategory = new Map(desiredExpenses.map((item) => [item.category, item]))
  const handledCategories = new Set<string>()

  for (const existing of existingRows) {
    const desired = desiredByCategory.get(existing.category)
    if (!desired || handledCategories.has(existing.category)) {
      tx.delete(expenses).where(eq(expenses.id, existing.id)).run()
      continue
    }

    handledCategories.add(existing.category)
    tx.update(expenses)
      .set({
        expenseDate: desired.expenseDate,
        description: desired.description,
        amountCents: desired.amountCents,
        fuelLitersDeciliters: desired.fuelLitersDeciliters,
        paymentMethod: desired.paymentMethod,
        receiptReference: desired.receiptReference,
        updatedAt: desired.updatedAt,
      })
      .where(eq(expenses.id, existing.id))
      .run()
  }

  const missingRows = desiredExpenses
    .filter((item) => !handledCategories.has(item.category))
    .map((item) => ({ ...item, tripId }))

  if (missingRows.length > 0) {
    tx.insert(expenses).values(missingRows).run()
  }
}

/**
 * Repositório responsável pelas consultas, ordenação e persistência transacional de viagens e despesas vinculadas.
 */
export class TripRepository implements ITripRepository {
  public constructor(private readonly database?: AppDatabase) {}

  private resolveDb(): AppDatabase {
    return this.database ?? getDatabase()
  }

  public findManyByFilter(driverId: number, filter: ResolvedTripFilter): TripRow[] {
    const conditions = buildWhereConditions(driverId, filter)
    const primarySortExpr = SORT_EXPRESSIONS[filter.sortBy]
    const orderByClauses =
      filter.sortDir === 'asc'
        ? [asc(primarySortExpr), asc(trips.id)]
        : [desc(primarySortExpr), desc(trips.id)]

    const rows = this.resolveDb()
      .select()
      .from(trips)
      .where(and(...conditions))
      .orderBy(...orderByClauses)
      .all()

    // Filtragem textual normalizada em memória garante correspondência UTF-8 sem acentos (SQLite LIKE é apenas ASCII).
    const searchTerm = filter.search?.trim()
    return searchTerm ? rows.filter((row) => matchesTripSearch(row, searchTerm)) : rows
  }

  public findByIdAndDriver(id: number, driverId: number): TripRow | undefined {
    return this.resolveDb()
      .select()
      .from(trips)
      .where(and(eq(trips.id, id), eq(trips.driverId, driverId)))
      .get()
  }

  public listDistinctStates(driverId: number): string[] {
    const rows = this.resolveDb()
      .select({
        originState: trips.originState,
        destinationState: trips.destinationState,
      })
      .from(trips)
      .where(eq(trips.driverId, driverId))
      .all()

    const stateSet = new Set<string>()
    for (const row of rows) {
      stateSet.add(row.originState)
      stateSet.add(row.destinationState)
    }

    return [...stateSet].sort()
  }

  public createWithLinkedExpenses(
    tripData: NewTripRow,
    linkedExpenses: readonly NewTripLinkedExpenseRow[],
  ): TripRow {
    return this.resolveDb().transaction((tx) => {
      const insertedTrip = tx.insert(trips).values(tripData).returning().get()

      if (linkedExpenses.length > 0) {
        tx.insert(expenses)
          .values(linkedExpenses.map((expense) => ({ ...expense, tripId: insertedTrip.id })))
          .run()
      }

      return insertedTrip
    })
  }

  public updateWithLinkedExpenses(
    id: number,
    driverId: number,
    tripData: Partial<NewTripRow>,
    linkedExpenses: readonly NewTripLinkedExpenseRow[],
  ): TripRow | undefined {
    return this.resolveDb().transaction((tx) => {
      const updatedTrip = tx
        .update(trips)
        .set(tripData)
        .where(and(eq(trips.id, id), eq(trips.driverId, driverId)))
        .returning()
        .get()

      if (!updatedTrip) {
        return undefined
      }

      syncLinkedExpensesInTx(tx, id, driverId, linkedExpenses)
      return updatedTrip
    })
  }

  public deleteByIdAndDriver(id: number, driverId: number): boolean {
    const deleted = this.resolveDb()
      .delete(trips)
      .where(and(eq(trips.id, id), eq(trips.driverId, driverId)))
      .returning({ id: trips.id })
      .get()

    return deleted !== undefined
  }
}

export const tripRepository = new TripRepository()
