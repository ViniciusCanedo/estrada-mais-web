import { ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_COMPETENCE_MONTH,
  formatCompetenceMonthLabel,
  shiftCompetenceMonth,
  useCompetencePeriod,
} from '../../app/composables/useCompetencePeriod'
import { formatLastSyncLabel } from '../../app/composables/useTelemetrySync'
import {
  formatCargoTons,
  formatCurrencyFromCents,
  formatDateBr,
  formatKm,
  formatKmPerLiterFromMilli,
  formatLitersFromDeciliters,
  formatShortDateBr,
} from '../../app/utils/formatters'

describe('Formatadores pt-BR (app/utils/formatters.ts)', () => {
  it('deve formatar centavos inteiros em moeda BRL com espaço padrão', () => {
    expect(formatCurrencyFromCents(482)).toBe('R$ 4,82')
    expect(formatCurrencyFromCents(2832000)).toBe('R$ 28.320,00')
    expect(formatCurrencyFromCents(0)).toBe('R$ 0,00')
    expect(formatCurrencyFromCents(-1999)).toBe('-R$ 19,99')
  })

  it('deve formatar quilômetros, decilitros e milésimos de km/L no padrão brasileiro', () => {
    expect(formatKm(14280)).toBe('14.280 km')
    expect(formatKm(784320)).toBe('784.320 km')
    expect(formatLitersFromDeciliters(7220)).toBe('722,0 L')
    expect(formatCargoTons(32.4)).toBe('32,4 ton')
    expect(formatKmPerLiterFromMilli(2420)).toBe('2,42 km/L')
  })

  it('deve formatar datas ISO-8601 completa e abreviada em pt-BR sem deslocamento de fuso', () => {
    expect(formatDateBr('2026-09-15')).toBe('15/09/2026')
    expect(formatDateBr('2026-09-15T23:59:00.000Z')).toBe('15/09/2026')
    expect(formatShortDateBr('2026-09-15')).toBe('15/09')
  })

  it('deve lançar RangeError ao tentar formatar data fora do padrão ISO-8601', () => {
    expect(() => formatDateBr('15/09/2026')).toThrow(RangeError)
    expect(() => formatShortDateBr('invalida')).toThrow(RangeError)
  })
})

describe('Período de Competência Mensal (useCompetencePeriod)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('deve deslocar meses corretamente tratando viradas de ano para frente e para trás', () => {
    expect(shiftCompetenceMonth('2026-01', -1)).toBe('2025-12')
    expect(shiftCompetenceMonth('2026-12', 1)).toBe('2027-01')
    expect(shiftCompetenceMonth('2026-09', -1)).toBe('2026-08')
    expect(shiftCompetenceMonth('2026-09', 1)).toBe('2026-10')
  })

  it('deve formatar o rótulo da competência mensal em caixa alta pt-BR', () => {
    expect(formatCompetenceMonthLabel('2026-09')).toBe('SETEMBRO 2026')
    expect(formatCompetenceMonthLabel('2025-12')).toBe('DEZEMBRO 2025')
    expect(formatCompetenceMonthLabel('2027-01')).toBe('JANEIRO 2027')
  })

  it('deve navegar entre meses e validar entradas no composable useCompetencePeriod', () => {
    const period = useCompetencePeriod()

    expect(period.selectedMonth.value).toBe(DEFAULT_COMPETENCE_MONTH)
    expect(period.formattedMonthLabel.value).toBe('SETEMBRO 2026')

    period.setMonth('2026-01')
    period.previousMonth()
    expect(period.selectedMonth.value).toBe('2025-12')
    expect(period.formattedMonthLabel.value).toBe('DEZEMBRO 2025')

    period.setMonth('2026-12')
    period.nextMonth()
    expect(period.selectedMonth.value).toBe('2027-01')
    expect(period.formattedMonthLabel.value).toBe('JANEIRO 2027')

    expect(() => period.setMonth('2026-13')).toThrow()
  })

  it('deve reutilizar useState global quando disponível no runtime Nuxt', () => {
    const sharedState = ref('2026-09')
    vi.stubGlobal('useState', (_key: string, _init: () => string) => sharedState)

    const period = useCompetencePeriod()
    period.nextMonth()

    expect(sharedState.value).toBe('2026-10')
    expect(period.formattedMonthLabel.value).toBe('OUTUBRO 2026')
  })

  it('deve formatar o tempo decorrido desde a última sincronização de telemetria', () => {
    const now = 1_700_000_000_000

    expect(formatLastSyncLabel(null, now)).toBe('Aguardando sync')
    expect(formatLastSyncLabel(now - 20_000, now)).toBe('Agora mesmo')
    expect(formatLastSyncLabel(now - 2 * 60_000, now)).toBe('Há 2 min')
    expect(formatLastSyncLabel(now - 2 * 60 * 60_000, now)).toBe('Há 2 h')
  })
})
