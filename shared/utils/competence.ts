import { competenceMonthSchema } from '../schemas/common.schema'

export const DEFAULT_COMPETENCE_MONTH = '2026-09'

const MONTHS_PER_YEAR = 12
const TREND_MONTH_OFFSETS = [-5, -4, -3, -2, -1, 0] as const

const MONTH_NAMES_PT_BR = [
  'JANEIRO',
  'FEVEREIRO',
  'MARÇO',
  'ABRIL',
  'MAIO',
  'JUNHO',
  'JULHO',
  'AGOSTO',
  'SETEMBRO',
  'OUTUBRO',
  'NOVEMBRO',
  'DEZEMBRO',
] as const

const MONTH_SHORT_PT_BR = [
  'JAN',
  'FEV',
  'MAR',
  'ABR',
  'MAI',
  'JUN',
  'JUL',
  'AGO',
  'SET',
  'OUT',
  'NOV',
  'DEZ',
] as const

const MONTH_TITLE_PT_BR = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
] as const

function parseCompetenceParts(month: string): { year: number; monthNumber: number } {
  const validated = competenceMonthSchema.parse(month)
  const [yearPart, monthPart] = validated.split('-')
  return {
    year: Number(yearPart),
    monthNumber: Number(monthPart),
  }
}

/**
 * Desloca uma competência AAAA-MM por um número inteiro de meses, tratando viradas de ano.
 */
export function shiftCompetenceMonth(month: string, deltaMonths: number): string {
  const { year, monthNumber } = parseCompetenceParts(month)
  const zeroBasedTotal = year * MONTHS_PER_YEAR + (monthNumber - 1) + deltaMonths
  const nextYear = Math.floor(zeroBasedTotal / MONTHS_PER_YEAR)
  const nextMonthIndex = ((zeroBasedTotal % MONTHS_PER_YEAR) + MONTHS_PER_YEAR) % MONTHS_PER_YEAR
  const nextMonth = nextMonthIndex + 1

  return `${String(nextYear).padStart(4, '0')}-${String(nextMonth).padStart(2, '0')}`
}

/**
 * Formata uma competência AAAA-MM em rótulo legível para cabeçalhos e Top Bar (ex.: "SETEMBRO 2026").
 */
export function formatCompetenceMonthLabel(month: string): string {
  const { year, monthNumber } = parseCompetenceParts(month)
  const monthLabel = MONTH_NAMES_PT_BR[monthNumber - 1] ?? ''
  return `${monthLabel} ${year}`
}

/**
 * Formata uma competência AAAA-MM para o eixo X do gráfico de evolução (ex.: "ABR", "SET (ATUAL)").
 */
export function formatShortMonthLabel(month: string, isCurrent = false): string {
  const { monthNumber } = parseCompetenceParts(month)
  const shortLabel = MONTH_SHORT_PT_BR[monthNumber - 1] ?? ''
  return isCurrent ? `${shortLabel} (ATUAL)` : shortLabel
}

/**
 * Retorna o nome do mês em pt-BR capitalizado para textos comparativos (ex.: "Agosto").
 */
export function formatMonthTitlePtBr(month: string): string {
  const { monthNumber } = parseCompetenceParts(month)
  return MONTH_TITLE_PT_BR[monthNumber - 1] ?? ''
}

/**
 * Retorna a sequência cronológica dos 6 meses encerrando na competência informada.
 */
export function listLastSixMonths(month: string): string[] {
  return TREND_MONTH_OFFSETS.map((offset) => shiftCompetenceMonth(month, offset))
}
