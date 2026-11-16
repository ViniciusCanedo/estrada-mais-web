import {
  dashboardFullPayloadSchema,
  dashboardSummaryResponseSchema,
  type DashboardFullPayload,
  type DashboardSummaryResponse,
  type ReportDriverProfile,
} from '../../shared/schemas/report.schema'
import {
  DEFAULT_COMPETENCE_MONTH,
  formatCompetenceMonthLabel,
  listLastSixMonths,
  shiftCompetenceMonth,
} from '../../shared/utils/competence'
import type { DriverRow } from '../database/schema'
import { driverRepository, type IDriverRepository } from '../repositories/driver.repository'
import {
  reportRepository,
  type IReportRepository,
  type MonthlyRawAggregates,
} from '../repositories/report.repository'
import { DomainError } from '../utils/domain-error'
import {
  buildHeroSummary,
  buildSecondaryStats,
  buildTrendPoint,
} from '../utils/report-calculations'
import { buildMonthlyAccountingCsv } from '../utils/report-csv'
import { toExpenseDto } from './expense.service'
import { toTripDto } from './trip.service'

export const REPORT_DRIVER_NOT_FOUND_MESSAGE = 'Motorista não encontrado.'

const RECENT_DASHBOARD_ITEMS_LIMIT = 5

export interface ReportServiceDependencies {
  reportRepo?: IReportRepository
  driverRepo?: IDriverRepository
}

export interface GeneratedMonthlyCsv {
  filename: string
  content: string
}

export interface IReportService {
  getDashboardData(driverId: number, month?: string): DashboardFullPayload
  generateMonthlyCsv(driverId: number, month?: string): GeneratedMonthlyCsv
}

function toDriverProfile(driver: DriverRow): ReportDriverProfile {
  return {
    name: driver.name,
    rntrc: driver.rntrc,
    vehicleModel: driver.vehicleModel,
    vehiclePlates: driver.vehiclePlates,
  }
}

/**
 * Serviço responsável por consolidação mensal do Painel Principal e exportação contábil CSV.
 */
export class ReportService implements IReportService {
  private readonly reportRepo: IReportRepository
  private readonly driverRepo: IDriverRepository

  public constructor(dependencies: ReportServiceDependencies = {}) {
    this.reportRepo = dependencies.reportRepo ?? reportRepository
    this.driverRepo = dependencies.driverRepo ?? driverRepository
  }

  private requireDriver(driverId: number): DriverRow {
    const driver = this.driverRepo.findById(driverId)
    if (!driver) {
      throw new DomainError('NOT_FOUND', REPORT_DRIVER_NOT_FOUND_MESSAGE)
    }
    return driver
  }

  private buildSummary(options: {
    driver: DriverRow
    activeMonth: string
    previousMonth: string
    currentAgg: MonthlyRawAggregates
    previousAgg: MonthlyRawAggregates
    trendAggregates: readonly MonthlyRawAggregates[]
  }): DashboardSummaryResponse {
    return dashboardSummaryResponseSchema.parse({
      month: options.activeMonth,
      monthLabel: formatCompetenceMonthLabel(options.activeMonth),
      hero: buildHeroSummary({
        currentAgg: options.currentAgg,
        previousAgg: options.previousAgg,
        previousMonth: options.previousMonth,
        maxCostPerKmCents: options.driver.maxCostPerKmCents,
      }),
      stats: buildSecondaryStats(
        options.currentAgg,
        options.previousAgg,
        options.driver.targetConsumptionMilliKml,
      ),
      trendSixMonths: options.trendAggregates.map((agg, index) =>
        buildTrendPoint(
          agg,
          options.driver.maxCostPerKmCents,
          index === options.trendAggregates.length - 1,
        ),
      ),
      recentTripsCount: options.currentAgg.tripsCount,
      recentExpensesCount: Object.values(options.currentAgg.expensesCountByCategory).reduce(
        (sum, item) => sum + item,
        0,
      ),
    })
  }

  public getDashboardData(driverId: number, month?: string): DashboardFullPayload {
    const driver = this.requireDriver(driverId)
    const activeMonth = month ?? DEFAULT_COMPETENCE_MONTH
    const previousMonth = shiftCompetenceMonth(activeMonth, -1)
    const sixMonths = listLastSixMonths(activeMonth)
    const sixMonthsAggregates = this.reportRepo.getSixMonthsAggregates(driverId, sixMonths)
    const currentAgg =
      sixMonthsAggregates[sixMonthsAggregates.length - 1] ??
      this.reportRepo.getMonthlyAggregates(driverId, activeMonth)
    const previousAgg =
      sixMonthsAggregates[sixMonthsAggregates.length - 2] ??
      this.reportRepo.getMonthlyAggregates(driverId, previousMonth)

    const summary = this.buildSummary({
      driver,
      activeMonth,
      previousMonth,
      currentAgg,
      previousAgg,
      trendAggregates: sixMonthsAggregates,
    })
    const recentTrips = this.reportRepo
      .listTripsForMonth(driverId, activeMonth)
      .slice(0, RECENT_DASHBOARD_ITEMS_LIMIT)
      .map(toTripDto)
    const recentExpenses = this.reportRepo
      .listExpensesForMonth(driverId, activeMonth)
      .slice(0, RECENT_DASHBOARD_ITEMS_LIMIT)
      .map(toExpenseDto)

    return dashboardFullPayloadSchema.parse({
      ...summary,
      driverProfile: toDriverProfile(driver),
      recentTrips,
      recentExpenses,
    })
  }

  public generateMonthlyCsv(driverId: number, month?: string): GeneratedMonthlyCsv {
    const driver = this.requireDriver(driverId)
    const activeMonth = month ?? DEFAULT_COMPETENCE_MONTH
    const previousMonth = shiftCompetenceMonth(activeMonth, -1)
    const currentAgg = this.reportRepo.getMonthlyAggregates(driverId, activeMonth)
    const previousAgg = this.reportRepo.getMonthlyAggregates(driverId, previousMonth)
    const summary = this.buildSummary({
      driver,
      activeMonth,
      previousMonth,
      currentAgg,
      previousAgg,
      trendAggregates: [],
    })
    const trips = this.reportRepo.listTripsForMonth(driverId, activeMonth).map(toTripDto)
    const expenses = this.reportRepo.listExpensesForMonth(driverId, activeMonth).map(toExpenseDto)

    return {
      filename: `estrada-mais-relatorio-${activeMonth}.csv`,
      content: buildMonthlyAccountingCsv({
        driverProfile: toDriverProfile(driver),
        summary,
        rawAggregates: currentAgg,
        trips,
        expenses,
      }),
    }
  }
}

export const reportService = new ReportService()
