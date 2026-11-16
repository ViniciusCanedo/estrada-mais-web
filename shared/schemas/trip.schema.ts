import { z } from 'zod'
import { isValidBrazilianState, tryParseCityAndState } from '../utils/telematics'
import { toDeciliters } from '../utils/units'
import { competenceMonthSchema } from './common.schema'

export const TRIP_PERIOD_OPTIONS = ['month', 'last90days', 'year'] as const
export const TRIP_SORT_FIELDS = [
  'tripDate',
  'route',
  'distanceKm',
  'kmPerLiter',
  'costPerKm',
] as const
export const TRIP_SORT_DIRECTIONS = ['asc', 'desc'] as const

const MAX_CARGO_WEIGHT_TONS = 200
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

function isValidCalendarDate(isoDate: string): boolean {
  const match = ISO_DATE_PATTERN.exec(isoDate)
  if (!match) {
    return false
  }
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const parsed = new Date(Date.UTC(year, month - 1, day))
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  )
}

function hasValidLocationFormat(value: string): boolean {
  return tryParseCityAndState(value) !== null
}

/**
 * Schema isomórfico de criação e atualização de viagem compartilhado entre UForm e endpoints Nitro.
 */
export const tripPayloadSchema = z
  .object({
    tripDate: z
      .string({ error: 'A data da viagem é obrigatória.' })
      .regex(ISO_DATE_PATTERN, 'Informe uma data válida no formato AAAA-MM-DD.')
      .refine(isValidCalendarDate, 'Informe uma data válida no formato AAAA-MM-DD.'),
    invoiceNumber: z
      .string()
      .trim()
      .max(40, 'O número da NF-e/CT-e deve ter no máximo 40 caracteres.')
      .optional()
      .or(z.literal('')),
    origin: z
      .string({ error: 'A cidade de origem é obrigatória.' })
      .trim()
      .refine(
        hasValidLocationFormat,
        'Informe a origem no formato "Cidade, UF" (ex.: Santos, SP).',
      ),
    destination: z
      .string({ error: 'A cidade de destino é obrigatória.' })
      .trim()
      .refine(
        hasValidLocationFormat,
        'Informe o destino no formato "Cidade, UF" (ex.: Rondonópolis, MT).',
      ),
    freightValueReais: z
      .number({ error: 'Informe o valor do frete bruto.' })
      .finite('O valor do frete bruto deve ser numérico.')
      .nonnegative('O valor do frete não pode ser negativo.')
      .default(0),
    cargoWeightTons: z
      .number({ error: 'O peso da carga deve ser numérico.' })
      .finite('O peso da carga deve ser numérico.')
      .positive('O peso da carga deve ser maior que zero.')
      .max(MAX_CARGO_WEIGHT_TONS, 'O peso da carga não pode exceder 200 toneladas.')
      .optional(),
    tollCostReais: z
      .number({ error: 'O custo de pedágio deve ser numérico.' })
      .finite('O custo de pedágio deve ser numérico.')
      .nonnegative('O custo de pedágio não pode ser negativo.')
      .default(0),
    kmStart: z
      .number({ error: 'O KM inicial é obrigatório.' })
      .int('O KM inicial deve ser um número inteiro.')
      .nonnegative('O KM inicial não pode ser negativo.'),
    kmEnd: z
      .number({ error: 'O KM final é obrigatório.' })
      .int('O KM final deve ser um número inteiro.')
      .positive('O KM final deve ser maior que zero.'),
    fuelLiters: z
      .number({ error: 'A litragem de diesel é obrigatória.' })
      .finite('A litragem de diesel deve ser numérica.')
      .positive('A quantidade de diesel deve ser maior que zero.')
      .refine((value) => toDeciliters(value) > 0, 'A quantidade mínima de diesel é 0,1 L.'),
    fuelCostReais: z
      .number({ error: 'O custo total de diesel é obrigatório.' })
      .finite('O custo de diesel deve ser numérico.')
      .nonnegative('O custo de diesel não pode ser negativo.'),
  })
  .refine((data) => data.kmEnd > data.kmStart, {
    path: ['kmEnd'],
    message: 'O KM final deve ser maior que o KM inicial (odômetro não pode retroceder).',
  })

/**
 * Schema de filtros e ordenação aceitos por GET /api/trips.
 */
export const tripFilterQuerySchema = z.object({
  month: competenceMonthSchema.optional(),
  period: z.enum(TRIP_PERIOD_OPTIONS).default('month'),
  search: z
    .string()
    .trim()
    .max(100, 'O termo de busca deve ter no máximo 100 caracteres.')
    .optional(),
  state: z
    .string()
    .trim()
    .toUpperCase()
    .refine((value) => value === 'TODOS' || isValidBrazilianState(value), 'UF inválida.')
    .default('TODOS'),
  sortBy: z.enum(TRIP_SORT_FIELDS).default('tripDate'),
  sortDir: z.enum(TRIP_SORT_DIRECTIONS).default('desc'),
})

/**
 * Schema de validação do parâmetro dinâmico :id nas rotas /api/trips/[id].
 */
export const tripIdParamsSchema = z.object({
  id: z.coerce
    .number({ error: 'Identificador de viagem inválido.' })
    .int('Identificador de viagem inválido.')
    .positive('Identificador de viagem inválido.'),
})

/**
 * Contrato serializado de uma viagem com telemetria calculada retornado pela API.
 */
export const tripDtoSchema = z.object({
  id: z.number().int().positive(),
  driverId: z.number().int().positive(),
  tripDate: z.string(),
  invoiceNumber: z.string().nullable(),
  origin: z.string(),
  originCity: z.string(),
  originState: z.string(),
  destination: z.string(),
  destinationCity: z.string(),
  destinationState: z.string(),
  cargoWeightTons: z.number().nullable(),
  freightValueReais: z.number().nonnegative(),
  tollCostReais: z.number().nonnegative(),
  kmStart: z.number().int().nonnegative(),
  kmEnd: z.number().int().positive(),
  distanceKm: z.number().int().positive(),
  fuelLiters: z.number().positive(),
  fuelCostReais: z.number().nonnegative(),
  kmPerLiter: z.number().nonnegative(),
  costPerKmReais: z.number().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

/**
 * Contrato do rodapé de totais ponderados das viagens filtradas.
 */
export const tripListSummarySchema = z.object({
  totalDistanceKm: z.number().nonnegative(),
  weightedAverageKmL: z.number().nonnegative(),
  totalFuelCostReais: z.number().nonnegative(),
  totalTollCostReais: z.number().nonnegative(),
  totalFreightValueReais: z.number().nonnegative(),
  weightedCostPerKmReais: z.number().nonnegative(),
})

/**
 * Contrato completo da resposta de listagem GET /api/trips.
 */
export const tripListResponseSchema = z.object({
  data: z.array(tripDtoSchema),
  meta: z.object({
    totalCount: z.number().int().nonnegative(),
    availableStates: z.array(z.string()),
    summary: tripListSummarySchema,
  }),
})

export type TripPeriodOption = (typeof TRIP_PERIOD_OPTIONS)[number]
export type TripSortField = (typeof TRIP_SORT_FIELDS)[number]
export type TripSortDirection = (typeof TRIP_SORT_DIRECTIONS)[number]
export type TripPayloadInput = z.infer<typeof tripPayloadSchema>
export type TripPayloadRequest = z.input<typeof tripPayloadSchema>
export type TripFilterQuery = z.infer<typeof tripFilterQuerySchema>
export type TripFilterQueryInput = z.input<typeof tripFilterQuerySchema>
export type TripIdParams = z.infer<typeof tripIdParamsSchema>
export type TripDto = z.infer<typeof tripDtoSchema>
export type TripListSummaryDto = z.infer<typeof tripListSummarySchema>
export type TripListResponse = z.infer<typeof tripListResponseSchema>
