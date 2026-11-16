import type { DashboardSummaryResponse, MonthlyTrendPoint } from '#shared/schemas/report.schema'
import { toCents, toDeciliters, toMilliKmL } from '#shared/utils/units'
import {
  formatCurrencyFromCents,
  formatKm,
  formatKmPerLiterFromMilli,
  formatLitersFromDeciliters,
} from './formatters'

export interface SecondaryStatCardViewModel {
  id: string
  title: string
  topBadge?: string
  topBadgeClass?: string
  icon?: string
  iconClass?: string
  value: string
  valueClass: string
  subtitle: string
  targetText?: string
  targetTestId?: string
  footer: string
  footerClass: string
  cardClass?: string
}

interface ChartGridTick {
  y: number
  label: string
}

interface ChartBarPointGeometry {
  month: string
  label: string
  cx: number
  barX: number
  barWidth: number
  maintY: number
  maintHeight: number
  tollY: number
  tollHeight: number
  dieselY: number
  dieselHeight: number
  totalY: number
  valueLabelY: number
  formattedTotal: string
  markerColor: string
  isCurrent: boolean
  isAboveTarget: boolean
}

export interface CostTrendChartGeometry {
  gridTicks: ChartGridTick[]
  targetLineY: number
  targetLabel: string
  bars: ChartBarPointGeometry[]
  polylinePoints: string
}

const CHART_TOP_Y = 24
const CHART_BOTTOM_Y = 180
const CHART_PLOT_HEIGHT = CHART_BOTTOM_Y - CHART_TOP_Y
const CHART_MIN_MAX_SCALE = 6
const CHART_FIRST_CX = 120
const CHART_STEP_X = 138
const CHART_BAR_WIDTH = 36

const PERCENT_FORMATTER = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

/**
 * Formata porcentagem em padrão pt-BR com 1 casa decimal (ex.: "37,6%").
 */
export function formatPercentPtBr(value: number): string {
  const safeValue = Number.isFinite(value) ? value : 0
  const normalized = safeValue === 0 ? 0 : safeValue
  return `${PERCENT_FORMATTER.format(normalized)}%`
}

function formatPlural(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`
}

function formatDeltaKmFooter(
  deltaKm: number,
  previousMonthLabel: string,
): { text: string; colorClass: string } {
  const shortPrev = previousMonthLabel.slice(0, 3).toLowerCase()
  const sign = deltaKm >= 0 ? '+' : '-'
  return {
    text: `${sign}${formatKm(Math.abs(deltaKm))} vs ${shortPrev}`,
    colorClass: deltaKm >= 0 ? 'text-highway-green font-semibold' : 'text-highway-muted',
  }
}

function buildKmAndDieselCards(
  stats: DashboardSummaryResponse['stats'],
  previousMonthLabel: string,
): SecondaryStatCardViewModel[] {
  const kmDelta = formatDeltaKmFooter(stats.kmDriven.deltaKmVsPrevious, previousMonthLabel)
  const dieselValue = formatKmPerLiterFromMilli(toMilliKmL(stats.dieselAverage.kmPerLiter)).replace(
    ' km/L',
    '',
  )
  const targetFormatted = formatKmPerLiterFromMilli(
    toMilliKmL(stats.dieselAverage.targetKmPerLiter),
  )
  const targetShort = targetFormatted.replace(' km/L', '')

  return [
    {
      id: 'km-driven',
      title: 'KM RODADOS',
      icon: 'i-lucide-trending-up',
      iconClass: 'text-highway-muted',
      value: formatKm(stats.kmDriven.totalKm).replace(' km', ''),
      valueClass: 'text-white',
      subtitle: 'km no mês',
      footer: kmDelta.text,
      footerClass: kmDelta.colorClass,
    },
    {
      id: 'diesel-average',
      title: 'MÉDIA DIESEL',
      icon: 'i-lucide-fuel',
      iconClass: 'text-amber-default',
      value: dieselValue,
      valueClass: 'text-amber-default',
      subtitle: 'km / Litro S10',
      targetText: `Meta ${targetFormatted}`,
      targetTestId: 'dashboard-consumption-target',
      footer: stats.dieselAverage.isTargetMet
        ? `Meta ${targetShort} superada`
        : `Abaixo da meta ${targetShort}`,
      footerClass: stats.dieselAverage.isTargetMet
        ? 'text-highway-green font-semibold'
        : 'text-amber-default font-semibold',
    },
  ]
}

function buildFuelAndTollsCards(
  stats: DashboardSummaryResponse['stats'],
): SecondaryStatCardViewModel[] {
  return [
    {
      id: 'fuel',
      title: 'COMBUSTÍVEL',
      topBadge: formatLitersFromDeciliters(toDeciliters(stats.fuel.totalLiters)),
      topBadgeClass: 'rounded-sm bg-expense-blue/20 px-1.5 py-0.5 text-expense-blue',
      value: formatCurrencyFromCents(toCents(stats.fuel.totalReais)),
      valueClass: 'text-white',
      subtitle: `Méd. ${formatCurrencyFromCents(toCents(stats.fuel.avgPricePerLiterReais))}/L`,
      footer: formatPlural(stats.fuel.refuelingsCount, 'abastecimento', 'abastecimentos'),
      footerClass: 'text-highway-muted',
    },
    {
      id: 'tolls',
      title: 'PEDÁGIOS',
      topBadge: formatPlural(stats.tolls.recordsCount, 'registro', 'registros'),
      topBadgeClass: 'rounded-sm bg-asphalt-bg px-1.5 py-0.5 text-highway-muted',
      value: formatCurrencyFromCents(toCents(stats.tolls.totalReais)),
      valueClass: 'text-white',
      subtitle: `${formatCurrencyFromCents(toCents(stats.tolls.costPerKmReais))} / km`,
      footer: 'Via Sem Parar / TAG',
      footerClass: 'text-highway-muted',
    },
  ]
}

function buildWorkshopCards(
  stats: DashboardSummaryResponse['stats'],
): SecondaryStatCardViewModel[] {
  return [
    {
      id: 'tire-shop',
      title: 'BORRACHARIA',
      topBadge: formatPlural(stats.tireShop.recordsCount, 'serviço', 'serviços'),
      topBadgeClass: 'text-highway-muted',
      value: formatCurrencyFromCents(toCents(stats.tireShop.totalReais)),
      valueClass: 'text-white',
      subtitle: 'Pneus e reparos',
      footer: stats.tireShop.lastDescription
        ? `Último: ${stats.tireShop.lastDescription}`
        : 'Sem registros no mês',
      footerClass: 'text-highway-muted truncate',
    },
    {
      id: 'maintenance',
      title: 'MANUTENÇÃO',
      topBadge: formatPlural(stats.maintenance.recordsCount, 'serviço', 'serviços'),
      topBadgeClass: 'text-highway-muted',
      value: formatCurrencyFromCents(toCents(stats.maintenance.totalReais)),
      valueClass: 'text-white',
      subtitle: 'Oficina e peças',
      footer: stats.maintenance.lastDescription ?? 'Sem registros no mês',
      footerClass: stats.maintenance.lastDescription
        ? 'text-highway-green truncate'
        : 'text-highway-muted',
    },
  ]
}

function buildFoodAndMarginCards(
  stats: DashboardSummaryResponse['stats'],
): SecondaryStatCardViewModel[] {
  const isPositiveMargin = stats.netMargin.netMarginReais >= 0

  return [
    {
      id: 'food',
      title: 'ALIMENTAÇÃO',
      topBadge: formatPlural(stats.food.daysCount, 'diária', 'diárias'),
      topBadgeClass: 'text-highway-muted',
      value: formatCurrencyFromCents(toCents(stats.food.totalReais)),
      valueClass: 'text-white',
      subtitle: `${formatCurrencyFromCents(toCents(stats.food.dailyAverageReais))} / dia méd.`,
      footer: 'Diárias e refeições',
      footerClass: 'text-highway-muted',
    },
    {
      id: 'net-margin',
      title: 'SOBRA LÍQUIDA',
      topBadge: isPositiveMargin ? 'LIVRE' : 'DÉFICIT',
      topBadgeClass: isPositiveMargin
        ? 'font-bold text-highway-green'
        : 'font-bold text-highway-red',
      value: formatCurrencyFromCents(toCents(stats.netMargin.netMarginReais)),
      valueClass: isPositiveMargin ? 'text-highway-green' : 'text-highway-red',
      subtitle: 'Fretes - Despesas',
      footer: `Margem: ${formatPercentPtBr(stats.netMargin.marginPercent)} do bruto`,
      footerClass: isPositiveMargin
        ? 'font-semibold text-highway-green'
        : 'font-semibold text-highway-red',
      cardClass: 'bg-linear-to-b from-asphalt-surface to-asphalt-bg',
    },
  ]
}

/**
 * Constrói os 8 modelos de exibição do grid secundário do Painel Principal.
 */
export function buildSecondaryStatCards(
  stats: DashboardSummaryResponse['stats'],
  previousMonthLabel: string,
): SecondaryStatCardViewModel[] {
  return [
    ...buildKmAndDieselCards(stats, previousMonthLabel),
    ...buildFuelAndTollsCards(stats),
    ...buildWorkshopCards(stats),
    ...buildFoodAndMarginCards(stats),
  ]
}

function resolveMarkerColor(isAboveTarget: boolean, isCurrent: boolean): string {
  if (isAboveTarget) {
    return '#ef4444'
  }
  return isCurrent ? '#ffb400' : '#ffffff'
}

function buildChartBarPoint(
  point: MonthlyTrendPoint,
  index: number,
  maxScale: number,
): ChartBarPointGeometry {
  const toHeight = (reais: number): number =>
    Math.max(0, (Math.min(reais, maxScale) / maxScale) * CHART_PLOT_HEIGHT)

  const cx = CHART_FIRST_CX + index * CHART_STEP_X
  const maintHeight = toHeight(point.maintenanceOthersPerKmReais)
  const tollHeight = toHeight(point.tollPerKmReais)
  const dieselHeight = toHeight(point.dieselPerKmReais)
  const maintY = CHART_BOTTOM_Y - maintHeight
  const tollY = maintY - tollHeight
  const dieselY = tollY - dieselHeight
  const totalY = CHART_BOTTOM_Y - toHeight(point.totalCostPerKmReais)

  return {
    month: point.month,
    label: point.label,
    cx,
    barX: cx - CHART_BAR_WIDTH / 2,
    barWidth: CHART_BAR_WIDTH,
    maintY,
    maintHeight,
    tollY,
    tollHeight,
    dieselY,
    dieselHeight,
    totalY,
    valueLabelY: Math.max(12, totalY - 10),
    formattedTotal: formatCurrencyFromCents(toCents(point.totalCostPerKmReais)),
    markerColor: resolveMarkerColor(point.isAboveTarget, point.isCurrent),
    isCurrent: point.isCurrent,
    isAboveTarget: point.isAboveTarget,
  }
}

/**
 * Calcula coordenadas dinâmicas do gráfico SVG de 6 meses mantendo escala proporcional a partir de zero.
 */
export function buildCostTrendChartGeometry(
  points: readonly MonthlyTrendPoint[],
  targetMaxCostPerKmReais: number,
): CostTrendChartGeometry {
  const maxPointValue = points.reduce(
    (max, item) => Math.max(max, item.totalCostPerKmReais),
    targetMaxCostPerKmReais,
  )
  const maxScale = Math.max(CHART_MIN_MAX_SCALE, Math.ceil(maxPointValue * 1.15))

  const gridTicks: ChartGridTick[] = [1, 0.75, 0.5, 0.25].map((fraction) => ({
    y: CHART_BOTTOM_Y - fraction * CHART_PLOT_HEIGHT,
    label: formatCurrencyFromCents(toCents(maxScale * fraction)),
  }))

  const bars = points.map((point, index) => buildChartBarPoint(point, index, maxScale))
  const targetRatio = Math.min(targetMaxCostPerKmReais, maxScale) / maxScale

  return {
    gridTicks,
    targetLineY: CHART_BOTTOM_Y - Math.max(0, targetRatio * CHART_PLOT_HEIGHT),
    targetLabel: formatCurrencyFromCents(toCents(targetMaxCostPerKmReais)),
    bars,
    polylinePoints: bars.map((bar) => `${bar.cx},${bar.totalY}`).join(' '),
  }
}
