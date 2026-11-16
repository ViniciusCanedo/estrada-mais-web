import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createDatabaseClient,
  resetDatabaseSingletonForTests,
  type AppDatabase,
} from '../../server/database/client'
import { runMigrations } from '../../server/database/migrate'
import {
  createTestDriver,
  createTestExpense,
  createTestTrip,
  seedDatabase,
} from '../../server/database/seed'
import { DriverRepository } from '../../server/repositories/driver.repository'
import { ReportRepository } from '../../server/repositories/report.repository'
import {
  REPORT_DRIVER_NOT_FOUND_MESSAGE,
  ReportService,
} from '../../server/services/report.service'
import { DomainError } from '../../server/utils/domain-error'
import { apportionPercentages } from '../../server/utils/report-calculations'
import { sanitizeCsvTextCell } from '../../server/utils/report-csv'
import { dashboardQuerySchema } from '../../shared/schemas/report.schema'
import {
  formatMonthTitlePtBr,
  formatShortMonthLabel,
  listLastSixMonths,
} from '../../shared/utils/competence'

describe('Schemas, Utilitários e ReportService (server/services/report.service)', () => {
  let db: AppDatabase
  let reportRepo: ReportRepository
  let driverRepo: DriverRepository
  let service: ReportService

  beforeEach(() => {
    db = createDatabaseClient(':memory:')
    runMigrations(db)
    reportRepo = new ReportRepository(db)
    driverRepo = new DriverRepository(db)
    service = new ReportService({ reportRepo, driverRepo })
  })

  afterEach(() => {
    resetDatabaseSingletonForTests()
    vi.unstubAllGlobals()
    if (db.$client.open) {
      db.$client.close()
    }
  })

  it('deve validar query do dashboard, gerar série de 6 meses com virada de ano e ratear proporções em 100%', () => {
    expect(dashboardQuerySchema.parse({})).toEqual({})
    expect(dashboardQuerySchema.parse({ month: '2026-09' })).toEqual({ month: '2026-09' })
    expect(dashboardQuerySchema.safeParse({ month: '2026-13' }).success).toBe(false)

    expect(listLastSixMonths('2026-02')).toEqual([
      '2025-09',
      '2025-10',
      '2025-11',
      '2025-12',
      '2026-01',
      '2026-02',
    ])
    expect(formatShortMonthLabel('2026-02', true)).toBe('FEV (ATUAL)')
    expect(formatShortMonthLabel('2025-12')).toBe('DEZ')
    expect(formatMonthTitlePtBr('2026-01')).toBe('Janeiro')

    expect(apportionPercentages([0, 0, 0])).toEqual([0, 0, 0])
    const split = apportionPercentages([1, 1, 1])
    expect(split).toEqual([34, 33, 33])
    expect(split[0] + split[1] + split[2]).toBe(100)

    const fiftyFifty = apportionPercentages([505, 495, 0])
    expect(fiftyFifty[0] + fiftyFifty[1] + fiftyFifty[2]).toBe(100)
  })

  it('deve calcular indicadores consolidados do motorista semeado em Setembro/2026', async () => {
    await seedDatabase(db)

    const payload = service.getDashboardData(1)
    expect(payload.month).toBe('2026-09')
    expect(payload.monthLabel).toBe('SETEMBRO 2026')
    expect(payload.driverProfile.name).toBe('Valdir Silveira')
    expect(payload.hero.targetMaxCostPerKmReais).toBeCloseTo(5.1, 6)
    expect(payload.hero.costPerKmReais).toBeCloseTo(3.36, 6)
    expect(
      payload.hero.proportions.fuelPercent +
        payload.hero.proportions.tollPercent +
        payload.hero.proportions.maintenanceOthersPercent,
    ).toBe(100)
    expect(payload.stats.kmDriven.totalKm).toBe(3755)
    expect(payload.stats.dieselAverage.kmPerLiter).toBeCloseTo(3755 / 1552.7, 4)
    expect(payload.stats.dieselAverage.isTargetMet).toBe(true)
    expect(payload.stats.fuel.totalReais).toBe(9853)
    expect(payload.stats.tolls.totalReais).toBe(1632)
    expect(payload.stats.tireShop.totalReais).toBe(180)
    expect(payload.stats.maintenance.totalReais).toBe(840)
    expect(payload.stats.food.totalReais).toBe(95)
    expect(payload.stats.netMargin.grossFreightReais).toBe(44300)
    expect(payload.stats.netMargin.totalExpensesReais).toBe(12600)
    expect(payload.stats.netMargin.netMarginReais).toBe(31700)
    expect(payload.trendSixMonths).toHaveLength(6)
    expect(payload.trendSixMonths[5]?.isCurrent).toBe(true)
    expect(payload.trendSixMonths[5]?.label).toBe('SET (ATUAL)')
    expect(payload.recentTrips).toHaveLength(5)
    expect(payload.recentExpenses).toHaveLength(5)
    expect(payload.recentExpensesCount).toBe(15)
  })

  it('deve tratar mês vazio sem NaN, déficit financeiro, aumento acima da meta e virada de ano', async () => {
    const driver = await createTestDriver(db, {
      targetConsumptionMilliKml: 2500,
      maxCostPerKmCents: 500,
    })

    const emptyPayload = service.getDashboardData(driver.id, '2026-09')
    expect(emptyPayload.hero.costPerKmReais).toBe(0)
    expect(emptyPayload.hero.deltaPercentVsPrevious).toBeNull()
    expect(emptyPayload.hero.deltaReaisPerKmVsPrevious).toBeNull()
    expect(emptyPayload.hero.proportions).toEqual({
      fuelPercent: 0,
      tollPercent: 0,
      maintenanceOthersPercent: 0,
    })
    expect(emptyPayload.stats.dieselAverage.kmPerLiter).toBe(0)
    expect(emptyPayload.stats.dieselAverage.isTargetMet).toBe(false)
    expect(emptyPayload.stats.fuel.avgPricePerLiterReais).toBe(0)
    expect(emptyPayload.stats.tolls.costPerKmReais).toBe(0)
    expect(emptyPayload.stats.food.dailyAverageReais).toBe(0)
    expect(emptyPayload.stats.netMargin.marginPercent).toBe(0)
    expect(Number.isNaN(emptyPayload.hero.costPerKmReais)).toBe(false)

    // Mês anterior (2026-01) com custo R$ 4,00/km; mês atual (2026-02) com custo R$ 6,00/km e déficit
    createTestTrip(db, driver.id, {
      tripDate: '2026-01-10',
      distanceKm: 1000,
      fuelLitersDeciliters: 4000,
      freightValueCents: 600000,
    })
    createTestExpense(db, driver.id, {
      expenseDate: '2026-01-10',
      category: 'combustivel',
      amountCents: 400000,
      fuelLitersDeciliters: 8000,
    })

    createTestTrip(db, driver.id, {
      tripDate: '2026-02-12',
      distanceKm: 1000,
      fuelLitersDeciliters: 4500,
      freightValueCents: 400000,
    })
    createTestExpense(db, driver.id, {
      expenseDate: '2026-02-12',
      category: 'combustivel',
      amountCents: 450000,
      fuelLitersDeciliters: 9000,
    })
    createTestExpense(db, driver.id, {
      expenseDate: '2026-02-14',
      category: 'manutencao',
      description: 'Revisão embreagem',
      amountCents: 150000,
      fuelLitersDeciliters: null,
    })

    const febPayload = service.getDashboardData(driver.id, '2026-02')
    expect(febPayload.hero.previousMonthLabel).toBe('Janeiro')
    expect(febPayload.hero.costPerKmReais).toBe(6)
    expect(febPayload.hero.deltaReaisPerKmVsPrevious).toBe(2)
    expect(febPayload.hero.deltaPercentVsPrevious).toBeCloseTo(50, 4)
    expect(febPayload.stats.netMargin.netMarginReais).toBe(-2000)
    expect(febPayload.stats.netMargin.marginPercent).toBeCloseTo(-50, 4)
    expect(febPayload.trendSixMonths.map((item) => item.month)).toEqual([
      '2025-09',
      '2025-10',
      '2025-11',
      '2025-12',
      '2026-01',
      '2026-02',
    ])
    expect(febPayload.trendSixMonths[5]?.isAboveTarget).toBe(true)
    expect(febPayload.trendSixMonths[4]?.isAboveTarget).toBe(false)
  })

  it('deve gerar CSV com UTF-8 BOM, separador ponto e vírgula e proteção contra CSV Injection', async () => {
    const driver = await createTestDriver(db, {
      name: '=HACKER',
    })
    const trip = createTestTrip(db, driver.id, {
      tripDate: '2026-09-15',
      invoiceNumber: '+10824',
      cargoWeightKg: null,
      originCity: 'Santos',
      originState: 'SP',
      destinationCity: 'Curitiba',
      destinationState: 'PR',
    })
    createTestExpense(db, driver.id, {
      tripId: trip.id,
      expenseDate: '2026-09-16',
      category: 'combustivel',
      description: '=CMD|"/C calc"!A0; teste',
      amountCents: 240000,
      fuelLitersDeciliters: 5000,
      receiptReference: '@SUM(A1)',
    })
    createTestExpense(db, driver.id, {
      expenseDate: '2026-09-14',
      category: 'outros',
      description: '-2+3\nquebra',
      amountCents: 5000,
      fuelLitersDeciliters: null,
      receiptReference: null,
    })

    expect(sanitizeCsvTextCell(null)).toBe('')
    expect(sanitizeCsvTextCell(undefined)).toBe('')
    expect(sanitizeCsvTextCell('=SUM(1,2)')).toBe("'=SUM(1,2)")
    expect(sanitizeCsvTextCell('+1+1')).toBe("'+1+1")
    expect(sanitizeCsvTextCell('-2+3')).toBe("'-2+3")
    expect(sanitizeCsvTextCell('@A1')).toBe("'@A1")
    expect(sanitizeCsvTextCell('\t=1')).toBe("'\t=1")
    expect(sanitizeCsvTextCell('\r=1')).toBe("' =1")
    expect(sanitizeCsvTextCell('Posto "Graal"; KM 10')).toBe('"Posto ""Graal""; KM 10"')

    const csv = service.generateMonthlyCsv(driver.id, '2026-09')
    expect(csv.filename).toBe('estrada-mais-relatorio-2026-09.csv')
    expect(csv.content.startsWith('\uFEFF')).toBe(true)
    expect(csv.content).toContain('RESUMO MENSAL (LIVRO-CAIXA)')
    expect(csv.content).toContain('VIAGENS DO MÊS')
    expect(csv.content).toContain('DESPESAS DO MÊS')
    expect(csv.content).toContain("'=HACKER")
    expect(csv.content).toContain("'+10824")
    expect(csv.content).toContain(`"'=CMD|""/C calc""!A0; teste"`)
    expect(csv.content).toContain("'@SUM(A1)")
    expect(csv.content).toContain("'-2+3 quebra")
    expect(csv.content).toContain('Sem comprovante')
    expect(csv.content).toContain(`Viagem #${trip.id}`)
    expect(csv.content).toContain('Avulsa')

    const defaultMonthCsv = service.generateMonthlyCsv(driver.id)
    expect(defaultMonthCsv.filename).toBe('estrada-mais-relatorio-2026-09.csv')
  })

  it('deve utilizar fallback quando getSixMonthsAggregates retornar série incompleta', async () => {
    const driver = await createTestDriver(db)
    createTestTrip(db, driver.id, { tripDate: '2026-09-10', distanceKm: 200 })
    const stubRepo = {
      getMonthlyAggregates: reportRepo.getMonthlyAggregates.bind(reportRepo),
      getSixMonthsAggregates: () => [],
      listTripsForMonth: reportRepo.listTripsForMonth.bind(reportRepo),
      listExpensesForMonth: reportRepo.listExpensesForMonth.bind(reportRepo),
    }
    const fallbackService = new ReportService({ reportRepo: stubRepo, driverRepo })
    const res = fallbackService.getDashboardData(driver.id, '2026-09')
    expect(res.stats.kmDriven.totalKm).toBe(200)
  })

  it('deve lançar DomainError NOT_FOUND quando o motorista não existe', () => {
    expect(() => service.getDashboardData(99999, '2026-09')).toThrowError(
      new DomainError('NOT_FOUND', REPORT_DRIVER_NOT_FOUND_MESSAGE),
    )
    expect(() => service.generateMonthlyCsv(99999, '2026-09')).toThrowError(
      new DomainError('NOT_FOUND', REPORT_DRIVER_NOT_FOUND_MESSAGE),
    )
  })
})
