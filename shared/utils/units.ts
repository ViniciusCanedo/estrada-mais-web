const CENTS_PER_REAL = 100
const DECILITERS_PER_LITER = 10
const KILOGRAMS_PER_TON = 1000
const MILLI_KML_PER_KML = 1000

// Normaliza -0 proveniente de Math.round(-0.001) ou divisão de -0 para 0 positivo.
function normalizeZero(value: number): number {
  return value === 0 ? 0 : value
}

function scaleToInteger(value: number, factor: number): number {
  return normalizeZero(Math.round(value * factor))
}

function unscaleFromInteger(value: number, factor: number): number {
  return normalizeZero(value / factor)
}

/**
 * Converte um valor monetário em reais para centavos inteiros.
 */
export function toCents(reais: number): number {
  return scaleToInteger(reais, CENTS_PER_REAL)
}

/**
 * Converte um valor monetário em centavos inteiros para reais.
 */
export function fromCents(cents: number): number {
  return unscaleFromInteger(cents, CENTS_PER_REAL)
}

/**
 * Converte um volume de combustível em litros para decilitros inteiros.
 */
export function toDeciliters(liters: number): number {
  return scaleToInteger(liters, DECILITERS_PER_LITER)
}

/**
 * Converte um volume de combustível em decilitros inteiros para litros.
 */
export function fromDeciliters(deciliters: number): number {
  return unscaleFromInteger(deciliters, DECILITERS_PER_LITER)
}

/**
 * Converte peso de carga em toneladas para quilogramas inteiros.
 */
export function toKg(tons: number): number {
  return scaleToInteger(tons, KILOGRAMS_PER_TON)
}

/**
 * Converte peso de carga em quilogramas inteiros para toneladas.
 */
export function fromKg(kg: number): number {
  return unscaleFromInteger(kg, KILOGRAMS_PER_TON)
}

/**
 * Converte consumo médio em km/L para milésimos de km/L inteiros.
 */
export function toMilliKmL(kmPerLiter: number): number {
  return scaleToInteger(kmPerLiter, MILLI_KML_PER_KML)
}

/**
 * Converte consumo médio em milésimos de km/L inteiros para km/L.
 */
export function fromMilliKmL(milliKmL: number): number {
  return unscaleFromInteger(milliKmL, MILLI_KML_PER_KML)
}
