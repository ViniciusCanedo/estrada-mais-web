import {
  tripDtoSchema,
  tripListResponseSchema,
  type TripDto,
  type TripFilterQuery,
  type TripListResponse,
  type TripPayloadInput,
} from '../../shared/schemas/trip.schema'
import {
  calculateTripListSummary,
  calculateTripTelematics,
  formatLocation,
  resolveTripDateRange,
  tryParseCityAndState,
} from '../../shared/utils/telematics'
import {
  fromCents,
  fromDeciliters,
  fromKg,
  toCents,
  toDeciliters,
  toKg,
} from '../../shared/utils/units'
import type { NewTripRow, TripRow } from '../database/schema'
import {
  tripRepository,
  type ITripRepository,
  type NewTripLinkedExpenseRow,
} from '../repositories/trip.repository'
import { DomainError } from '../utils/domain-error'

export const TRIP_NOT_FOUND_MESSAGE = 'Viagem não encontrada.'
export const INVALID_ODOMETER_MESSAGE =
  'O KM final deve ser maior que o KM inicial (odômetro não pode retroceder).'
export const INVALID_LOCATION_MESSAGE = 'Informe origem e destino válidos no formato "Cidade, UF".'
export const INVALID_FUEL_LITERS_MESSAGE = 'A quantidade mínima de diesel é 0,1 L.'

interface PreparedTripPersistence {
  tripFields: Omit<NewTripRow, 'driverId' | 'createdAt' | 'updatedAt'>
  linkedExpenses: NewTripLinkedExpenseRow[]
}

export interface TripServiceDependencies {
  tripRepo?: ITripRepository
  nowProvider?: () => Date
}

export interface ITripService {
  listTrips(driverId: number, query: TripFilterQuery): TripListResponse
  createTrip(driverId: number, input: TripPayloadInput): TripDto
  updateTrip(driverId: number, tripId: number, input: TripPayloadInput): TripDto
  deleteTrip(driverId: number, tripId: number): void
}

function toTripDto(row: TripRow): TripDto {
  const origin = formatLocation(row.originCity, row.originState)
  const destination = formatLocation(row.destinationCity, row.destinationState)
  const fuelLiters = fromDeciliters(row.fuelLitersDeciliters)
  const fuelCostReais = fromCents(row.fuelCostCents)
  const tollCostReais = fromCents(row.tollCostCents)
  const telematics = calculateTripTelematics({
    kmStart: row.kmStart,
    kmEnd: row.kmEnd,
    fuelLiters,
    fuelCostReais,
    tollCostReais,
  })

  return tripDtoSchema.parse({
    id: row.id,
    driverId: row.driverId,
    tripDate: row.tripDate,
    invoiceNumber: row.invoiceNumber,
    origin,
    originCity: row.originCity,
    originState: row.originState,
    destination,
    destinationCity: row.destinationCity,
    destinationState: row.destinationState,
    cargoWeightTons: row.cargoWeightKg !== null ? fromKg(row.cargoWeightKg) : null,
    freightValueReais: fromCents(row.freightValueCents),
    tollCostReais,
    kmStart: row.kmStart,
    kmEnd: row.kmEnd,
    distanceKm: row.distanceKm,
    fuelLiters,
    fuelCostReais,
    kmPerLiter: telematics.kmPerLiter,
    costPerKmReais: telematics.costPerKmReais,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  })
}

interface LinkedExpensesContext {
  driverId: number
  tripDate: string
  routeLabel: string
  invoiceNumber: string | null
  fuelCostCents: number
  tollCostCents: number
  fuelLitersDeciliters: number
  timestampIso: string
}

function buildLinkedTripExpenses(context: LinkedExpensesContext): NewTripLinkedExpenseRow[] {
  const linkedExpenses: NewTripLinkedExpenseRow[] = []

  if (context.fuelCostCents > 0) {
    linkedExpenses.push({
      driverId: context.driverId,
      expenseDate: context.tripDate,
      category: 'combustivel',
      description: `Abastecimento Percurso: ${context.routeLabel}`,
      amountCents: context.fuelCostCents,
      fuelLitersDeciliters: context.fuelLitersDeciliters,
      paymentMethod: 'cartao_frota',
      receiptReference: context.invoiceNumber ? `NF-e ${context.invoiceNumber}` : 'Viagem',
      createdAt: context.timestampIso,
      updatedAt: context.timestampIso,
    })
  }

  if (context.tollCostCents > 0) {
    linkedExpenses.push({
      driverId: context.driverId,
      expenseDate: context.tripDate,
      category: 'pedagio',
      description: `Pedágios Percurso: ${context.routeLabel}`,
      amountCents: context.tollCostCents,
      fuelLitersDeciliters: null,
      paymentMethod: 'cartao_frota',
      receiptReference: 'Via TAG / Percurso',
      createdAt: context.timestampIso,
      updatedAt: context.timestampIso,
    })
  }

  return linkedExpenses
}

function resolveNormalizedInvoice(rawInvoice: string | undefined): string | null {
  const trimmed = rawInvoice?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : null
}

function resolveValidatedFuelDeciliters(fuelLiters: number): number {
  const deciliters = toDeciliters(fuelLiters)
  if (deciliters <= 0) {
    throw new DomainError('VALIDATION_ERROR', INVALID_FUEL_LITERS_MESSAGE)
  }
  return deciliters
}

function prepareTripPersistence(
  driverId: number,
  input: TripPayloadInput,
  timestampIso: string,
): PreparedTripPersistence {
  if (input.kmEnd <= input.kmStart) {
    throw new DomainError('VALIDATION_ERROR', INVALID_ODOMETER_MESSAGE)
  }

  const originParsed = tryParseCityAndState(input.origin)
  const destinationParsed = tryParseCityAndState(input.destination)
  if (!originParsed || !destinationParsed) {
    throw new DomainError('VALIDATION_ERROR', INVALID_LOCATION_MESSAGE)
  }

  const fuelLitersDeciliters = resolveValidatedFuelDeciliters(input.fuelLiters)
  const invoiceNumber = resolveNormalizedInvoice(input.invoiceNumber)
  const fuelCostCents = toCents(input.fuelCostReais)
  const tollCostCents = toCents(input.tollCostReais)
  const originLabel = formatLocation(originParsed.city, originParsed.state)
  const destinationLabel = formatLocation(destinationParsed.city, destinationParsed.state)

  return {
    tripFields: {
      tripDate: input.tripDate,
      invoiceNumber,
      originCity: originParsed.city,
      originState: originParsed.state,
      destinationCity: destinationParsed.city,
      destinationState: destinationParsed.state,
      cargoWeightKg: input.cargoWeightTons !== undefined ? toKg(input.cargoWeightTons) : null,
      freightValueCents: toCents(input.freightValueReais),
      tollCostCents,
      kmStart: input.kmStart,
      kmEnd: input.kmEnd,
      distanceKm: input.kmEnd - input.kmStart,
      fuelLitersDeciliters,
      fuelCostCents,
    },
    linkedExpenses: buildLinkedTripExpenses({
      driverId,
      tripDate: input.tripDate,
      routeLabel: `${originLabel} → ${destinationLabel}`,
      invoiceNumber,
      fuelCostCents,
      tollCostCents,
      fuelLitersDeciliters,
      timestampIso,
    }),
  }
}

/**
 * Serviço de domínio responsável por viagens rodoviárias, telemetria e sincronização transacional com despesas.
 */
export class TripService implements ITripService {
  private readonly tripRepo: ITripRepository
  private readonly nowProvider: () => Date

  public constructor(dependencies: TripServiceDependencies = {}) {
    this.tripRepo = dependencies.tripRepo ?? tripRepository
    this.nowProvider = dependencies.nowProvider ?? (() => new Date())
  }

  public listTrips(driverId: number, query: TripFilterQuery): TripListResponse {
    const dateRange = resolveTripDateRange(query.period, query.month, this.nowProvider())
    const rows = this.tripRepo.findManyByFilter(driverId, {
      ...dateRange,
      ...(query.search !== undefined ? { search: query.search } : {}),
      state: query.state,
      sortBy: query.sortBy,
      sortDir: query.sortDir,
    })

    const data = rows.map(toTripDto)
    const availableStates = this.tripRepo.listDistinctStates(driverId)
    const summary = calculateTripListSummary(data)

    return tripListResponseSchema.parse({
      data,
      meta: {
        totalCount: data.length,
        availableStates,
        summary,
      },
    })
  }

  public createTrip(driverId: number, input: TripPayloadInput): TripDto {
    const nowIso = this.nowProvider().toISOString()
    const { tripFields, linkedExpenses } = prepareTripPersistence(driverId, input, nowIso)
    const created = this.tripRepo.createWithLinkedExpenses(
      {
        ...tripFields,
        driverId,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      linkedExpenses,
    )

    return toTripDto(created)
  }

  public updateTrip(driverId: number, tripId: number, input: TripPayloadInput): TripDto {
    const existing = this.tripRepo.findByIdAndDriver(tripId, driverId)
    if (!existing) {
      throw new DomainError('NOT_FOUND', TRIP_NOT_FOUND_MESSAGE)
    }

    const nowIso = this.nowProvider().toISOString()
    const { tripFields, linkedExpenses } = prepareTripPersistence(driverId, input, nowIso)
    const updated = this.tripRepo.updateWithLinkedExpenses(
      tripId,
      driverId,
      {
        ...tripFields,
        updatedAt: nowIso,
      },
      linkedExpenses,
    )

    if (!updated) {
      throw new DomainError('NOT_FOUND', TRIP_NOT_FOUND_MESSAGE)
    }

    return toTripDto(updated)
  }

  public deleteTrip(driverId: number, tripId: number): void {
    const deleted = this.tripRepo.deleteByIdAndDriver(tripId, driverId)
    if (!deleted) {
      throw new DomainError('NOT_FOUND', TRIP_NOT_FOUND_MESSAGE)
    }
  }
}

export const tripService = new TripService()
