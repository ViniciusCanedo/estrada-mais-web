import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { competenceMonthSchema } from '#shared/schemas/common.schema'

export const DEFAULT_COMPETENCE_MONTH = '2026-09'

const MONTHS_PER_YEAR = 12

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

export interface CompetencePeriodState {
  selectedMonth: Ref<string>
  formattedMonthLabel: ComputedRef<string>
  previousMonth: () => void
  nextMonth: () => void
  setMonth: (month: string) => void
}

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
 * Formata uma competência AAAA-MM em rótulo legível para a Top Bar (ex.: "SETEMBRO 2026").
 */
export function formatCompetenceMonthLabel(month: string): string {
  const { year, monthNumber } = parseCompetenceParts(month)
  const monthLabel = MONTH_NAMES_PT_BR[monthNumber - 1] ?? ''
  return `${monthLabel} ${year}`
}

function createCompetenceMonthRef(): Ref<string> {
  if (typeof useState === 'function') {
    return useState<string>('estrada-competence-month', () => DEFAULT_COMPETENCE_MONTH)
  }
  return ref<string>(DEFAULT_COMPETENCE_MONTH)
}

/**
 * Gerencia o período de competência mensal compartilhado entre Top Bar, Sidebar e telas de domínio.
 */
export function useCompetencePeriod(): CompetencePeriodState {
  const selectedMonth = createCompetenceMonthRef()
  const formattedMonthLabel = computed(() => formatCompetenceMonthLabel(selectedMonth.value))

  function previousMonth(): void {
    selectedMonth.value = shiftCompetenceMonth(selectedMonth.value, -1)
  }

  function nextMonth(): void {
    selectedMonth.value = shiftCompetenceMonth(selectedMonth.value, 1)
  }

  function setMonth(month: string): void {
    selectedMonth.value = competenceMonthSchema.parse(month)
  }

  return {
    selectedMonth,
    formattedMonthLabel,
    previousMonth,
    nextMonth,
    setMonth,
  }
}
