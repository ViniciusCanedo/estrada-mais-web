import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { competenceMonthSchema } from '#shared/schemas/common.schema'
import {
  DEFAULT_COMPETENCE_MONTH,
  formatCompetenceMonthLabel,
  shiftCompetenceMonth,
} from '#shared/utils/competence'

export { DEFAULT_COMPETENCE_MONTH, formatCompetenceMonthLabel, shiftCompetenceMonth }

export interface CompetencePeriodState {
  selectedMonth: Ref<string>
  formattedMonthLabel: ComputedRef<string>
  previousMonth: () => void
  nextMonth: () => void
  setMonth: (month: string) => void
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
