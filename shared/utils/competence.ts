import { competenceMonthSchema } from '../schemas/common.schema'

export const DEFAULT_COMPETENCE_MONTH = '2026-09'

const MONTHS_PER_YEAR = 12
const TREND_MONTH_OFFSETS = [-5, -4, -3, -2, -1, 0] as const

type MonthNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12

interface MonthLabelsEntry {
  readonly full: string
  readonly short: string
  readonly title: string
}

const MONTH_LABELS_PT_BR: Record<MonthNumber, MonthLabelsEntry> = {
  1: { full: 'JANEIRO', short: 'JAN', title: 'Janeiro' },
  2: { full: 'FEVEREIRO', short: 'FEV', title: 'Fevereiro' },
  3: { full: 'MARÇO', short: 'MAR', title: 'Março' },
  4: { full: 'ABRIL', short: 'ABR', title: 'Abril' },
  5: { full: 'MAIO', short: 'MAI', title: 'Maio' },
  6: { full: 'JUNHO', short: 'JUN', title: 'Junho' },
  7: { full: 'JULHO', short: 'JUL', title: 'Julho' },
  8: { full: 'AGOSTO', short: 'AGO', title: 'Agosto' },
  9: { full: 'SETEMBRO', short: 'SET', title: 'Setembro' },
  10: { full: 'OUTUBRO', short: 'OUT', title: 'Outubro' },
  11: { full: 'NOVEMBRO', short: 'NOV', title: 'Novembro' },
  12: { full: 'DEZEMBRO', short: 'DEZ', title: 'Dezembro' },
}

function parseCompetenceParts(month: string): { year: number; monthNumber: MonthNumber } {
  const validated = competenceMonthSchema.parse(month)
  const [yearPart, monthPart] = validated.split('-')
  return {
    year: Number(yearPart),
    monthNumber: Number(monthPart) as MonthNumber,
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
  return `${MONTH_LABELS_PT_BR[monthNumber].full} ${year}`
}

/**
 * Formata uma competência AAAA-MM para o eixo X do gráfico de evolução (ex.: "ABR", "SET (ATUAL)").
 */
export function formatShortMonthLabel(month: string, isCurrent = false): string {
  const { monthNumber } = parseCompetenceParts(month)
  const shortLabel = MONTH_LABELS_PT_BR[monthNumber].short
  return isCurrent ? `${shortLabel} (ATUAL)` : shortLabel
}

/**
 * Retorna o nome do mês em pt-BR capitalizado para textos comparativos (ex.: "Agosto").
 */
export function formatMonthTitlePtBr(month: string): string {
  const { monthNumber } = parseCompetenceParts(month)
  return MONTH_LABELS_PT_BR[monthNumber].title
}

/**
 * Retorna a sequência cronológica dos 6 meses encerrando na competência informada.
 */
export function listLastSixMonths(month: string): string[] {
  return TREND_MONTH_OFFSETS.map((offset) => shiftCompetenceMonth(month, offset))
}
