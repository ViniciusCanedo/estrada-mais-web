import { BRAZILIAN_STATES, type BrazilianState } from '../types/domain'
import { fromCents, fromDeciliters, toCents, toDeciliters } from './units'

const BRAZILIAN_STATE_SET = new Set<string>(BRAZILIAN_STATES)

export interface ParsedCityAndState {
  city: string
  state: BrazilianState
}

export interface TripTelematicsInput {
  kmStart: number
  kmEnd: number
  fuelLiters: number
  fuelCostReais: number
  tollCostReais: number
}

export interface TripTelematicsResult {
  isValidDistance: boolean
  distanceKm: number
  kmPerLiter: number
  costPerKmReais: number
}

export interface TripSummarySource {
  distanceKm: number
  fuelLiters: number
  fuelCostReais: number
  tollCostReais: number
  freightValueReais: number
}

export interface TripListSummary {
  totalDistanceKm: number
  weightedAverageKmL: number
  totalFuelCostReais: number
  totalTollCostReais: number
  totalFreightValueReais: number
  weightedCostPerKmReais: number
}

function toFiniteNonNegative(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0
}

/**
 * Verifica se a sigla informada corresponde a uma das 27 UFs brasileiras válidas.
 */
export function isValidBrazilianState(uf: string): uf is BrazilianState {
  return BRAZILIAN_STATE_SET.has(uf)
}

/**
 * Tenta extrair cidade e UF normalizada a partir do formato "Cidade, UF", retornando null se inválido.
 */
export function tryParseCityAndState(rawLocation: string): ParsedCityAndState | null {
  const trimmed = rawLocation.trim()
  const commaIndex = trimmed.lastIndexOf(',')
  if (commaIndex <= 0) {
    return null
  }

  const city = trimmed.slice(0, commaIndex).trim()
  const state = trimmed
    .slice(commaIndex + 1)
    .trim()
    .toUpperCase()

  if (city.length === 0 || !isValidBrazilianState(state)) {
    return null
  }

  return { city, state }
}

/**
 * Extrai cidade e UF validada do formato "Cidade, UF", lançando RangeError quando inválida.
 */
export function parseCityAndState(rawLocation: string): ParsedCityAndState {
  const parsed = tryParseCityAndState(rawLocation)
  if (!parsed) {
    throw new RangeError(
      `Localização inválida "${rawLocation}". Informe no formato "Cidade, UF" com UF brasileira válida.`,
    )
  }
  return parsed
}

/**
 * Formata cidade e UF no padrão exibido pela aplicação ("Cidade, UF").
 */
export function formatLocation(city: string, state: string): string {
  return `${city}, ${state}`
}

/**
 * Normaliza texto para busca insensível a acentos e maiúsculas/minúsculas.
 */
export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/**
 * Calcula distância, consumo médio (km/L) e custo por km sem divisão por zero ou NaN.
 */
export function calculateTripTelematics(input: TripTelematicsInput): TripTelematicsResult {
  const hasFiniteOdometers = Number.isFinite(input.kmStart) && Number.isFinite(input.kmEnd)
  const isValidDistance = hasFiniteOdometers && input.kmStart >= 0 && input.kmEnd > input.kmStart

  if (!isValidDistance) {
    return {
      isValidDistance: false,
      distanceKm: 0,
      kmPerLiter: 0,
      costPerKmReais: 0,
    }
  }

  const distanceKm = input.kmEnd - input.kmStart
  const validFuelLiters = toFiniteNonNegative(input.fuelLiters)
  // Soma em centavos inteiros para evitar erro binário de ponto flutuante (ex.: 0.1 + 0.2).
  const totalCostCents =
    toCents(toFiniteNonNegative(input.fuelCostReais)) +
    toCents(toFiniteNonNegative(input.tollCostReais))

  return {
    isValidDistance: true,
    distanceKm,
    kmPerLiter: validFuelLiters > 0 ? distanceKm / validFuelLiters : 0,
    costPerKmReais: fromCents(totalCostCents) / distanceKm,
  }
}

/**
 * Calcula totalizadores consolidados e média ponderada real para o rodapé da lista de viagens.
 */
export function calculateTripListSummary(trips: readonly TripSummarySource[]): TripListSummary {
  let totalDistanceKm = 0
  let totalFuelDeciliters = 0
  let totalFuelCostCents = 0
  let totalTollCostCents = 0
  let totalFreightValueCents = 0

  for (const trip of trips) {
    totalDistanceKm += toFiniteNonNegative(trip.distanceKm)
    totalFuelDeciliters += toDeciliters(toFiniteNonNegative(trip.fuelLiters))
    totalFuelCostCents += toCents(toFiniteNonNegative(trip.fuelCostReais))
    totalTollCostCents += toCents(toFiniteNonNegative(trip.tollCostReais))
    totalFreightValueCents += toCents(toFiniteNonNegative(trip.freightValueReais))
  }

  const totalFuelLiters = fromDeciliters(totalFuelDeciliters)
  const totalFuelCostReais = fromCents(totalFuelCostCents)
  const totalTollCostReais = fromCents(totalTollCostCents)
  const totalFreightValueReais = fromCents(totalFreightValueCents)
  const totalOperationalCostReais = fromCents(totalFuelCostCents + totalTollCostCents)

  return {
    totalDistanceKm,
    weightedAverageKmL: totalFuelLiters > 0 ? totalDistanceKm / totalFuelLiters : 0,
    totalFuelCostReais,
    totalTollCostReais,
    totalFreightValueReais,
    weightedCostPerKmReais: totalDistanceKm > 0 ? totalOperationalCostReais / totalDistanceKm : 0,
  }
}
