import { sql } from 'drizzle-orm'
import { check, index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from '../../shared/types/domain'

/**
 * Cadastro do motorista autônomo (TAC), credenciais e metas operacionais de telemetria.
 */
export const drivers = sqliteTable(
  'drivers',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    rntrc: text('rntrc').notNull(),
    vehicleModel: text('vehicle_model').notNull(),
    vehiclePlates: text('vehicle_plates').notNull(),
    targetConsumptionMilliKml: integer('target_consumption_milli_kml').notNull().default(2350),
    maxCostPerKmCents: integer('max_cost_per_km_cents').notNull().default(510),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [uniqueIndex('drivers_email_unique').on(table.email)],
)

/**
 * Tokens de uso único (armazenados exclusivamente como hash SHA-256) para redefinição de senha.
 */
export const passwordResetTokens = sqliteTable(
  'password_reset_tokens',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    driverId: integer('driver_id')
      .notNull()
      .references(() => drivers.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: text('expires_at').notNull(),
    usedAt: text('used_at'),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    uniqueIndex('password_reset_tokens_hash_unique').on(table.tokenHash),
    index('password_reset_tokens_driver_idx').on(table.driverId),
  ],
)

/**
 * Viagens rodoviárias com odômetro, consumo, frete bruto e custos associados em inteiros escalados.
 */
export const trips = sqliteTable(
  'trips',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    driverId: integer('driver_id')
      .notNull()
      .references(() => drivers.id, { onDelete: 'cascade' }),
    tripDate: text('trip_date').notNull(),
    invoiceNumber: text('invoice_number'),
    originCity: text('origin_city').notNull(),
    originState: text('origin_state').notNull(),
    destinationCity: text('destination_city').notNull(),
    destinationState: text('destination_state').notNull(),
    cargoWeightKg: integer('cargo_weight_kg'),
    freightValueCents: integer('freight_value_cents').notNull().default(0),
    tollCostCents: integer('toll_cost_cents').notNull().default(0),
    kmStart: integer('km_start').notNull(),
    kmEnd: integer('km_end').notNull(),
    distanceKm: integer('distance_km').notNull(),
    fuelLitersDeciliters: integer('fuel_liters_deciliters').notNull(),
    fuelCostCents: integer('fuel_cost_cents').notNull().default(0),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('trips_driver_date_idx').on(table.driverId, table.tripDate),
    index('trips_origin_state_idx').on(table.driverId, table.originState),
    index('trips_dest_state_idx').on(table.driverId, table.destinationState),
    check('trips_km_end_gt_start_chk', sql`${table.kmEnd} > ${table.kmStart}`),
    check('trips_distance_positive_chk', sql`${table.distanceKm} > 0`),
    check('trips_fuel_liters_positive_chk', sql`${table.fuelLitersDeciliters} > 0`),
  ],
)

/**
 * Diário contábil único de despesas operacionais (avulsas ou originadas automaticamente de viagens).
 */
export const expenses = sqliteTable(
  'expenses',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    driverId: integer('driver_id')
      .notNull()
      .references(() => drivers.id, { onDelete: 'cascade' }),
    tripId: integer('trip_id').references(() => trips.id, { onDelete: 'cascade' }),
    expenseDate: text('expense_date').notNull(),
    category: text('category', { enum: EXPENSE_CATEGORIES }).notNull(),
    description: text('description').notNull(),
    amountCents: integer('amount_cents').notNull(),
    fuelLitersDeciliters: integer('fuel_liters_deciliters'),
    paymentMethod: text('payment_method', { enum: PAYMENT_METHODS }).notNull(),
    receiptReference: text('receipt_reference'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('expenses_driver_date_idx').on(table.driverId, table.expenseDate),
    index('expenses_driver_category_date_idx').on(
      table.driverId,
      table.category,
      table.expenseDate,
    ),
    index('expenses_trip_idx').on(table.tripId),
    check('expenses_amount_positive_chk', sql`${table.amountCents} > 0`),
  ],
)

export type DriverRow = typeof drivers.$inferSelect
export type NewDriverRow = typeof drivers.$inferInsert
export type PasswordResetTokenRow = typeof passwordResetTokens.$inferSelect
export type NewPasswordResetTokenRow = typeof passwordResetTokens.$inferInsert
export type TripRow = typeof trips.$inferSelect
export type NewTripRow = typeof trips.$inferInsert
export type ExpenseRow = typeof expenses.$inferSelect
export type NewExpenseRow = typeof expenses.$inferInsert
