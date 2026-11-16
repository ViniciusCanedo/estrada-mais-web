import type {
  DashboardSummaryResponse,
  MonthlyTrendPoint,
} from '../../shared/schemas/report.schema'
import { formatMonthTitlePtBr, formatShortMonthLabel } from '../../shared/utils/competence'
import { fromCents, fromDeciliters, fromMilliKmL } from '../../shared/utils/units'
import type { MonthlyRawAggregates } from '../repositories/report.repository'

interface CategoryCostSummary {
  fuelCents: number
  tollCents: number
  tireShopCents: number
  maintenanceCents: number
  foodCents: number
  maintenanceOthersCents: number
  totalExpensesCents: number
}

function sumCategoryExpensesCents(agg: MonthlyRawAggregates): CategoryCostSummary {
  const { combustivel, pedagio, borracharia, manutencao, alimentacao, outros } =
    agg.expensesByCategoryCents
  const maintenanceOthersCents = borracharia + manutencao + alimentacao + outros

  return {
    fuelCents: combustivel,
    tollCents: pedagio,
    tireShopCents: borracharia,
    maintenanceCents: manutencao,
    foodCents: alimentacao,
    maintenanceOthersCents,
    totalExpensesCents: combustivel + pedagio + maintenanceOthersCents,
  }
}

function computeCostPerKmCents(amountCents: number, totalDistanceKm: number): number {
  return totalDistanceKm > 0 ? Math.round(amountCents / totalDistanceKm) : 0
}

/**
 * Rateia três valores inteiros em porcentagens inteiras cuja soma é exatamente 100 (ou 0 quando zerados).
 */
export function apportionPercentages(
  weights: readonly [number, number, number],
): [number, number, number] {
  const total = weights[0] + weights[1] + weights[2]
  if (total <= 0) {
    return [0, 0, 0]
  }

  const exact: [number, number, number] = [
    (weights[0] / total) * 100,
    (weights[1] / total) * 100,
    (weights[2] / total) * 100,
  ]
  const result: [number, number, number] = [
    Math.floor(exact[0]),
    Math.floor(exact[1]),
    Math.floor(exact[2]),
  ]
  const remainder = 100 - (result[0] + result[1] + result[2])
  const order = ([0, 1, 2] as const)
    .slice()
    .sort((a, b) => exact[b] - result[b] - (exact[a] - result[a]))

  for (let step = 0; step < remainder; step += 1) {
    const targetIndex = order[step]
    if (targetIndex !== undefined) {
      result[targetIndex] += 1
    }
  }

  return result
}

/**
 * Constrói um ponto mensal da série histórica de 6 meses para o gráfico de tendência.
 */
export function buildTrendPoint(
  agg: MonthlyRawAggregates,
  maxCostPerKmCents: number,
  isCurrent: boolean,
): MonthlyTrendPoint {
  const costs = sumCategoryExpensesCents(agg)
  const totalCostPerKmCents = computeCostPerKmCents(costs.totalExpensesCents, agg.totalDistanceKm)

  return {
    month: agg.month,
    label: formatShortMonthLabel(agg.month, isCurrent),
    totalCostPerKmReais: fromCents(totalCostPerKmCents),
    dieselPerKmReais: fromCents(computeCostPerKmCents(costs.fuelCents, agg.totalDistanceKm)),
    tollPerKmReais: fromCents(computeCostPerKmCents(costs.tollCents, agg.totalDistanceKm)),
    maintenanceOthersPerKmReais: fromCents(
      computeCostPerKmCents(costs.maintenanceOthersCents, agg.totalDistanceKm),
    ),
    isAboveTarget: agg.totalDistanceKm > 0 && totalCostPerKmCents > maxCostPerKmCents,
    isCurrent,
  }
}

/**
 * Calcula o bloco mestre (R$/km, delta vs mês anterior e barra proporcional) do Painel Principal.
 */
export function buildHeroSummary(options: {
  currentAgg: MonthlyRawAggregates
  previousAgg: MonthlyRawAggregates
  previousMonth: string
  maxCostPerKmCents: number
}): DashboardSummaryResponse['hero'] {
  const currentCosts = sumCategoryExpensesCents(options.currentAgg)
  const previousCosts = sumCategoryExpensesCents(options.previousAgg)
  const currentCostPerKmCents = computeCostPerKmCents(
    currentCosts.totalExpensesCents,
    options.currentAgg.totalDistanceKm,
  )
  const previousCostPerKmCents = computeCostPerKmCents(
    previousCosts.totalExpensesCents,
    options.previousAgg.totalDistanceKm,
  )

  const hasComparisonBase = options.currentAgg.totalDistanceKm > 0 && previousCostPerKmCents > 0
  const diffCents = currentCostPerKmCents - previousCostPerKmCents
  const [fuelPercent, tollPercent, maintenanceOthersPercent] = apportionPercentages([
    currentCosts.fuelCents,
    currentCosts.tollCents,
    currentCosts.maintenanceOthersCents,
  ])

  return {
    costPerKmReais: fromCents(currentCostPerKmCents),
    targetMaxCostPerKmReais: fromCents(options.maxCostPerKmCents),
    deltaPercentVsPrevious: hasComparisonBase ? (diffCents / previousCostPerKmCents) * 100 : null,
    deltaReaisPerKmVsPrevious: hasComparisonBase ? fromCents(diffCents) : null,
    previousMonthLabel: formatMonthTitlePtBr(options.previousMonth),
    proportions: {
      fuelPercent,
      tollPercent,
      maintenanceOthersPercent,
    },
  }
}

function buildFuelAndRoadStats(
  currentAgg: MonthlyRawAggregates,
  previousAgg: MonthlyRawAggregates,
  costs: CategoryCostSummary,
  targetConsumptionMilliKml: number,
): Pick<DashboardSummaryResponse['stats'], 'kmDriven' | 'dieselAverage' | 'fuel' | 'tolls'> {
  const tripFuelLiters = fromDeciliters(currentAgg.totalTripFuelDeciliters)
  const kmPerLiter =
    currentAgg.totalDistanceKm > 0 && tripFuelLiters > 0
      ? currentAgg.totalDistanceKm / tripFuelLiters
      : 0
  const targetKmPerLiter = fromMilliKmL(targetConsumptionMilliKml)
  const expenseFuelLiters = fromDeciliters(currentAgg.totalExpenseFuelDeciliters)
  const fuelTotalReais = fromCents(costs.fuelCents)

  return {
    kmDriven: {
      totalKm: currentAgg.totalDistanceKm,
      deltaKmVsPrevious: currentAgg.totalDistanceKm - previousAgg.totalDistanceKm,
    },
    dieselAverage: {
      kmPerLiter,
      targetKmPerLiter,
      isTargetMet: kmPerLiter >= targetKmPerLiter,
    },
    fuel: {
      totalReais: fuelTotalReais,
      totalLiters: expenseFuelLiters,
      avgPricePerLiterReais: expenseFuelLiters > 0 ? fuelTotalReais / expenseFuelLiters : 0,
      refuelingsCount: currentAgg.expensesCountByCategory.combustivel,
    },
    tolls: {
      totalReais: fromCents(costs.tollCents),
      costPerKmReais: fromCents(computeCostPerKmCents(costs.tollCents, currentAgg.totalDistanceKm)),
      recordsCount: currentAgg.expensesCountByCategory.pedagio,
    },
  }
}

function buildWorkshopAndMarginStats(
  currentAgg: MonthlyRawAggregates,
  costs: CategoryCostSummary,
): Pick<DashboardSummaryResponse['stats'], 'tireShop' | 'maintenance' | 'food' | 'netMargin'> {
  const foodDaysCount = currentAgg.expensesCountByCategory.alimentacao
  const netMarginCents = currentAgg.totalGrossFreightCents - costs.totalExpensesCents

  return {
    tireShop: {
      totalReais: fromCents(costs.tireShopCents),
      recordsCount: currentAgg.expensesCountByCategory.borracharia,
      lastDescription: currentAgg.lastTireShopDescription,
    },
    maintenance: {
      totalReais: fromCents(costs.maintenanceCents),
      recordsCount: currentAgg.expensesCountByCategory.manutencao,
      lastDescription: currentAgg.lastMaintenanceDescription,
    },
    food: {
      totalReais: fromCents(costs.foodCents),
      daysCount: foodDaysCount,
      dailyAverageReais:
        foodDaysCount > 0 ? fromCents(Math.round(costs.foodCents / foodDaysCount)) : 0,
    },
    netMargin: {
      netMarginReais: fromCents(netMarginCents),
      grossFreightReais: fromCents(currentAgg.totalGrossFreightCents),
      totalExpensesReais: fromCents(costs.totalExpensesCents),
      marginPercent:
        currentAgg.totalGrossFreightCents > 0
          ? (netMarginCents / currentAgg.totalGrossFreightCents) * 100
          : 0,
    },
  }
}

/**
 * Calcula os 8 blocos de indicadores secundários do Painel Principal sem divisão por zero.
 */
export function buildSecondaryStats(
  currentAgg: MonthlyRawAggregates,
  previousAgg: MonthlyRawAggregates,
  targetConsumptionMilliKml: number,
): DashboardSummaryResponse['stats'] {
  const costs = sumCategoryExpensesCents(currentAgg)
  return {
    ...buildFuelAndRoadStats(currentAgg, previousAgg, costs, targetConsumptionMilliKml),
    ...buildWorkshopAndMarginStats(currentAgg, costs),
  }
}
