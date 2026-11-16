import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import type { DashboardFullPayload, MonthlyTrendPoint } from '#shared/schemas/report.schema'
import CostTrendSvgChart from '~/components/dashboard/CostTrendSvgChart.vue'
import HeroCostCard from '~/components/dashboard/HeroCostCard.vue'
import RecentExpensesTableCard from '~/components/dashboard/RecentExpensesTableCard.vue'
import RecentTripsTableCard from '~/components/dashboard/RecentTripsTableCard.vue'
import SecondaryStatsGrid from '~/components/dashboard/SecondaryStatsGrid.vue'

function makePoint(month: string, label: string, total: number): MonthlyTrendPoint {
  return {
    month,
    label,
    totalCostPerKmReais: total,
    dieselPerKmReais: Number((total * 0.6).toFixed(2)),
    tollPerKmReais: Number((total * 0.18).toFixed(2)),
    maintenanceOthersPerKmReais: Number((total * 0.22).toFixed(2)),
    isAboveTarget: total > 5.1,
    isCurrent: month === '2026-09',
  }
}

const SAMPLE_HERO: DashboardFullPayload['hero'] = {
  costPerKmReais: 4.82,
  targetMaxCostPerKmReais: 5.1,
  deltaPercentVsPrevious: -4.1,
  deltaReaisPerKmVsPrevious: -0.21,
  previousMonthLabel: 'Agosto',
  proportions: { fuelPercent: 62, tollPercent: 18, maintenanceOthersPercent: 20 },
}

const SAMPLE_STATS: DashboardFullPayload['stats'] = {
  kmDriven: { totalKm: 14280, deltaKmVsPrevious: 1240 },
  dieselAverage: { kmPerLiter: 2.42, targetKmPerLiter: 2.35, isTargetMet: true },
  fuel: { totalReais: 28320, totalLiters: 5900, avgPricePerLiterReais: 4.8, refuelingsCount: 8 },
  tolls: { totalReais: 3840, costPerKmReais: 0.27, recordsCount: 32 },
  tireShop: { totalReais: 1250, recordsCount: 2, lastDescription: 'Rod. Pres. Dutra' },
  maintenance: { totalReais: 4600, recordsCount: 1, lastDescription: 'Óleo + Filtros 80k' },
  food: { totalReais: 2450, daysCount: 24, dailyAverageReais: 102.08 },
  netMargin: {
    netMarginReais: 24380,
    grossFreightReais: 64840,
    totalExpensesReais: 40460,
    marginPercent: 37.6,
  },
}

const TREND_POINTS: MonthlyTrendPoint[] = [
  makePoint('2026-04', 'ABR', 5.3),
  makePoint('2026-05', 'MAI', 5.15),
  makePoint('2026-06', 'JUN', 5.42),
  makePoint('2026-07', 'JUL', 5.1),
  makePoint('2026-08', 'AGO', 5.03),
  makePoint('2026-09', 'SET (ATUAL)', 4.82),
]

const EMPTY_HERO: DashboardFullPayload['hero'] = {
  costPerKmReais: 0,
  targetMaxCostPerKmReais: 5.1,
  deltaPercentVsPrevious: null,
  deltaReaisPerKmVsPrevious: null,
  previousMonthLabel: 'Agosto',
  proportions: { fuelPercent: 0, tollPercent: 0, maintenanceOthersPercent: 0 },
}

const EMPTY_STATS: DashboardFullPayload['stats'] = {
  kmDriven: { totalKm: 0, deltaKmVsPrevious: -1200 },
  dieselAverage: { kmPerLiter: 0, targetKmPerLiter: 2.35, isTargetMet: false },
  fuel: { totalReais: 0, totalLiters: 0, avgPricePerLiterReais: 0, refuelingsCount: 0 },
  tolls: { totalReais: 0, costPerKmReais: 0, recordsCount: 0 },
  tireShop: { totalReais: 0, recordsCount: 0, lastDescription: null },
  maintenance: { totalReais: 0, recordsCount: 0, lastDescription: null },
  food: { totalReais: 0, daysCount: 0, dailyAverageReais: 0 },
  netMargin: {
    netMarginReais: -500,
    grossFreightReais: 0,
    totalExpensesReais: 500,
    marginPercent: 0,
  },
}

describe('Componentes do Painel Principal (Nuxt Runtime)', () => {
  it('deve renderizar HeroCostCard para economia, aumento acima da meta e ausência de base anterior', async () => {
    const economyWrapper = await mountSuspended(HeroCostCard, {
      props: { hero: SAMPLE_HERO },
    })
    expect(economyWrapper.find('[data-testid="dashboard-max-cost-badge"]').text()).toBe(
      'META: ≤ R$ 5,10',
    )
    expect(economyWrapper.find('[data-testid="hero-cost-per-km-value"]').text()).toBe('R$ 4,82')
    expect(economyWrapper.find('[data-testid="hero-delta-compare"]').text()).toContain(
      'Economia de R$ 0,21/km',
    )

    const increaseWrapper = await mountSuspended(HeroCostCard, {
      props: {
        hero: {
          ...SAMPLE_HERO,
          costPerKmReais: 5.5,
          deltaPercentVsPrevious: 9.3,
          deltaReaisPerKmVsPrevious: 0.47,
        },
      },
    })
    expect(increaseWrapper.find('[data-testid="hero-delta-compare"]').text()).toContain(
      'Aumento de R$ 0,47/km',
    )

    const emptyWrapper = await mountSuspended(HeroCostCard, {
      props: { hero: EMPTY_HERO },
    })
    expect(emptyWrapper.find('[data-testid="hero-delta-compare"]').text()).toContain(
      'Sem comparativo vs Agosto',
    )
  })

  it('deve renderizar SecondaryStatsGrid, CostTrendSvgChart e tabelas resumo com dados reais e vazios', async () => {
    const fullGrid = await mountSuspended(SecondaryStatsGrid, {
      props: { stats: SAMPLE_STATS, previousMonthLabel: 'Agosto' },
    })
    expect(fullGrid.find('[data-testid="dashboard-consumption-target"]').text()).toBe(
      'Meta 2,35 km/L',
    )
    expect(fullGrid.text()).toContain('Meta 2,35 superada')
    expect(fullGrid.text()).toContain('LIVRE')

    const emptyGrid = await mountSuspended(SecondaryStatsGrid, {
      props: { stats: EMPTY_STATS, previousMonthLabel: 'Agosto' },
    })
    expect(emptyGrid.find('[data-testid="dashboard-consumption-target"]').text()).toBe(
      'Meta 2,35 km/L',
    )
    expect(emptyGrid.text()).toContain('Abaixo da meta 2,35')
    expect(emptyGrid.text()).toContain('DÉFICIT')
    expect(emptyGrid.text()).not.toContain('NaN')

    const fullChart = await mountSuspended(CostTrendSvgChart, {
      props: { points: TREND_POINTS, targetMaxCostPerKmReais: 5.1 },
    })
    expect(fullChart.find('polyline').attributes('points')).not.toContain('NaN')
    expect(fullChart.html()).toContain('#ef4444')
    expect(fullChart.html()).toContain('#ffb400')

    const emptyChart = await mountSuspended(CostTrendSvgChart, {
      props: {
        points: TREND_POINTS.map((item) => makePoint(item.month, item.label, 0)),
        targetMaxCostPerKmReais: 5.1,
      },
    })
    expect(emptyChart.find('polyline').attributes('points')).not.toContain('NaN')

    const emptyTripsCard = await mountSuspended(RecentTripsTableCard, {
      props: { trips: [], totalCount: 0 },
    })
    expect(emptyTripsCard.find('[data-testid="recent-trips-empty"]').exists()).toBe(true)

    const emptyExpensesCard = await mountSuspended(RecentExpensesTableCard, {
      props: { expenses: [], totalCount: 0 },
    })
    expect(emptyExpensesCard.find('[data-testid="recent-expenses-empty"]').exists()).toBe(true)
  })
})
