import { fromCents, fromDeciliters, fromMilliKmL } from '#shared/utils/units'

const BRL_FORMATTER = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const INTEGER_FORMATTER = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 0,
})

const LITERS_FORMATTER = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

const KML_FORMATTER = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/

function extractIsoDateParts(isoDate: string): [string, string, string] {
  const match = ISO_DATE_PATTERN.exec(isoDate.trim())
  if (!match || !match[1] || !match[2] || !match[3]) {
    throw new RangeError(`Data ISO inválida para formatação pt-BR: "${isoDate}".`)
  }
  return [match[1], match[2], match[3]]
}

/**
 * Formata um valor em centavos inteiros para moeda BRL (ex.: 482 -> "R$ 4,82").
 */
export function formatCurrencyFromCents(cents: number): string {
  // Normaliza espaço não-quebrável (U+00A0) emitido pelo Intl para espaço ASCII consistente.
  return BRL_FORMATTER.format(fromCents(cents)).replace(/\u00a0/g, ' ')
}

/**
 * Formata distância ou odômetro inteiro em quilômetros (ex.: 14280 -> "14.280 km").
 */
export function formatKm(km: number): string {
  return `${INTEGER_FORMATTER.format(Math.round(km))} km`
}

/**
 * Formata volume em decilitros inteiros para litros em pt-BR (ex.: 7220 -> "722,0 L").
 */
export function formatLitersFromDeciliters(deciliters: number): string {
  return `${LITERS_FORMATTER.format(fromDeciliters(deciliters))} L`
}

/**
 * Formata média de consumo em milésimos de km/L para pt-BR (ex.: 2420 -> "2,42 km/L").
 */
export function formatKmPerLiterFromMilli(milliKmL: number): string {
  return `${KML_FORMATTER.format(fromMilliKmL(milliKmL))} km/L`
}

/**
 * Formata data ISO-8601 (YYYY-MM-DD) para DD/MM/AAAA sem deslocamento de fuso horário.
 */
export function formatDateBr(isoDate: string): string {
  const [year, month, day] = extractIsoDateParts(isoDate)
  return `${day}/${month}/${year}`
}

/**
 * Formata data ISO-8601 (YYYY-MM-DD) para DD/MM em tabelas compactas.
 */
export function formatShortDateBr(isoDate: string): string {
  const [, month, day] = extractIsoDateParts(isoDate)
  return `${day}/${month}`
}
