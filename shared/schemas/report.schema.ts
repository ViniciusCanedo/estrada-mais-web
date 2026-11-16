import { z } from 'zod'
import { competenceMonthSchema } from './common.schema'
import { expenseDtoSchema } from './expense.schema'
import { tripDtoSchema } from './trip.schema'

/**
 * Query string aceita pelos endpoints de consolidação e exportação do Painel Principal.
 */
export const dashboardQuerySchema = z.object({
  month: competenceMonthSchema.optional(),
})

/**
 * Ponto mensal da série histórica de seis meses do custo operacional por quilômetro.
 */
export const monthlyTrendPointSchema = z.object({
  month: z.string(),
  label: z.string(),
  totalCostPerKmReais: z.number().nonnegative(),
  dieselPerKmReais: z.number().nonnegative(),
  tollPerKmReais: z.number().nonnegative(),
  maintenanceOthersPerKmReais: z.number().nonnegative(),
  isAboveTarget: z.boolean(),
  isCurrent: z.boolean(),
})

/**
 * Dados cadastrais mínimos do motorista exibidos no cabeçalho contábil do relatório de impressão.
 */
export const reportDriverProfileSchema = z.object({
  name: z.string(),
  rntrc: z.string(),
  vehicleModel: z.string(),
  vehiclePlates: z.string(),
})

/**
 * Resumo consolidado de indicadores do Painel Principal na competência mensal selecionada.
 */
export const dashboardSummaryResponseSchema = z.object({
  month: z.string(),
  monthLabel: z.string(),
  hero: z.object({
    costPerKmReais: z.number().nonnegative(),
    targetMaxCostPerKmReais: z.number().positive(),
    deltaPercentVsPrevious: z.number().nullable(),
    deltaReaisPerKmVsPrevious: z.number().nullable(),
    previousMonthLabel: z.string(),
    proportions: z.object({
      fuelPercent: z.number().int().min(0).max(100),
      tollPercent: z.number().int().min(0).max(100),
      maintenanceOthersPercent: z.number().int().min(0).max(100),
    }),
  }),
  stats: z.object({
    kmDriven: z.object({
      totalKm: z.number().nonnegative(),
      deltaKmVsPrevious: z.number(),
    }),
    dieselAverage: z.object({
      kmPerLiter: z.number().nonnegative(),
      targetKmPerLiter: z.number().positive(),
      isTargetMet: z.boolean(),
    }),
    fuel: z.object({
      totalReais: z.number().nonnegative(),
      totalLiters: z.number().nonnegative(),
      avgPricePerLiterReais: z.number().nonnegative(),
      refuelingsCount: z.number().int().nonnegative(),
    }),
    tolls: z.object({
      totalReais: z.number().nonnegative(),
      costPerKmReais: z.number().nonnegative(),
      recordsCount: z.number().int().nonnegative(),
    }),
    tireShop: z.object({
      totalReais: z.number().nonnegative(),
      recordsCount: z.number().int().nonnegative(),
      lastDescription: z.string().nullable(),
    }),
    maintenance: z.object({
      totalReais: z.number().nonnegative(),
      recordsCount: z.number().int().nonnegative(),
      lastDescription: z.string().nullable(),
    }),
    food: z.object({
      totalReais: z.number().nonnegative(),
      daysCount: z.number().int().nonnegative(),
      dailyAverageReais: z.number().nonnegative(),
    }),
    netMargin: z.object({
      netMarginReais: z.number(),
      grossFreightReais: z.number().nonnegative(),
      totalExpensesReais: z.number().nonnegative(),
      marginPercent: z.number(),
    }),
  }),
  trendSixMonths: z.array(monthlyTrendPointSchema),
  recentTripsCount: z.number().int().nonnegative(),
  recentExpensesCount: z.number().int().nonnegative(),
})

/**
 * Payload completo retornado por GET /api/reports/dashboard com tabelas resumo e perfil contábil.
 */
export const dashboardFullPayloadSchema = dashboardSummaryResponseSchema.extend({
  driverProfile: reportDriverProfileSchema,
  recentTrips: z.array(tripDtoSchema),
  recentExpenses: z.array(expenseDtoSchema),
})

/**
 * Envelope padrão da resposta HTTP de GET /api/reports/dashboard.
 */
export const dashboardApiResponseSchema = z.object({
  data: dashboardFullPayloadSchema,
})

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>
export type MonthlyTrendPoint = z.infer<typeof monthlyTrendPointSchema>
export type ReportDriverProfile = z.infer<typeof reportDriverProfileSchema>
export type DashboardSummaryResponse = z.infer<typeof dashboardSummaryResponseSchema>
export type DashboardFullPayload = z.infer<typeof dashboardFullPayloadSchema>
export type DashboardApiResponse = z.infer<typeof dashboardApiResponseSchema>
