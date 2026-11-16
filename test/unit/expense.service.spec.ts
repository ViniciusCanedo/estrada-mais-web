import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createDatabaseClient,
  resetDatabaseSingletonForTests,
  type AppDatabase,
} from '../../server/database/client'
import { runMigrations } from '../../server/database/migrate'
import { createTestDriver, createTestExpense, createTestTrip } from '../../server/database/seed'
import { ExpenseRepository } from '../../server/repositories/expense.repository'
import {
  classifyReceiptBadge,
  EXPENSE_NOT_FOUND_MESSAGE,
  ExpenseService,
  FUEL_LITERS_REQUIRED_MESSAGE,
} from '../../server/services/expense.service'
import { DomainError } from '../../server/utils/domain-error'
import {
  expenseFilterQuerySchema,
  expenseIdParamsSchema,
  expensePayloadSchema,
} from '../../shared/schemas/expense.schema'

describe('Schemas Expense e ExpenseService (server/services/expense.service)', () => {
  let db: AppDatabase
  let repository: ExpenseRepository
  let service: ExpenseService

  beforeEach(() => {
    db = createDatabaseClient(':memory:')
    runMigrations(db)
    repository = new ExpenseRepository(db)
    service = new ExpenseService({ expenseRepo: repository })
  })

  afterEach(() => {
    resetDatabaseSingletonForTests()
    vi.unstubAllGlobals()
    if (db.$client.open) {
      db.$client.close()
    }
  })

  it('deve validar litragem obrigatória apenas para combustível e limites dos schemas Zod', () => {
    const missingLiters = expensePayloadSchema.safeParse({
      category: 'combustivel',
      expenseDate: '2026-09-16',
      description: 'Posto Graal KM 56',
      amountReais: 2400,
      paymentMethod: 'cartao_frota',
    })
    expect(missingLiters.success).toBe(false)
    expect(missingLiters.error?.issues[0]?.message).toBe(FUEL_LITERS_REQUIRED_MESSAGE)

    const zeroLiters = expensePayloadSchema.safeParse({
      category: 'combustivel',
      expenseDate: '2026-09-16',
      description: 'Posto Graal KM 56',
      fuelLiters: 0,
      amountReais: 2400,
      paymentMethod: 'cartao_frota',
    })
    expect(zeroLiters.success).toBe(false)

    const validFuel = expensePayloadSchema.parse({
      category: 'combustivel',
      expenseDate: '2026-09-16',
      description: '  Posto Graal Rodovia dos Bandeirantes KM 56  ',
      fuelLiters: 500,
      amountReais: 2400,
      paymentMethod: 'cartao_frota',
      receiptReference: '  NF-e 8912  ',
    })
    expect(validFuel.description).toBe('Posto Graal Rodovia dos Bandeirantes KM 56')
    expect(validFuel.receiptReference).toBe('NF-e 8912')

    const validMaintenance = expensePayloadSchema.parse({
      category: 'manutencao',
      expenseDate: '2026-09-12',
      description: 'Troca de filtro Scania',
      fuelLiters: null,
      amountReais: 840,
      receiptReference: '',
    })
    expect(validMaintenance.paymentMethod).toBe('cartao_frota')

    expect(expenseFilterQuerySchema.parse({})).toEqual({ category: 'todas' })
    expect(expenseFilterQuerySchema.parse({ month: '2026-09', category: 'pedagio' })).toEqual({
      month: '2026-09',
      category: 'pedagio',
    })
    expect(expenseFilterQuerySchema.safeParse({ month: '2026-13' }).success).toBe(false)

    expect(expenseIdParamsSchema.parse({ id: '42' })).toEqual({ id: 42 })
    expect(expenseIdParamsSchema.safeParse({ id: '0' }).success).toBe(false)
  })

  it('deve converter unidades inteiras, calcular preço por litro e classificar comprovantes fiscais', async () => {
    const driver = await createTestDriver(db)

    const fuelDto = service.createExpense(driver.id, {
      category: 'combustivel',
      expenseDate: '2026-09-16',
      description: 'Posto Graal Rodovia dos Bandeirantes KM 56',
      fuelLiters: 500,
      amountReais: 2400,
      paymentMethod: 'cartao_frota',
      receiptReference: 'NF-e 8912',
    })

    expect(fuelDto.fuelLiters).toBe(500)
    expect(fuelDto.amountReais).toBe(2400)
    expect(fuelDto.pricePerLiterReais).toBeCloseTo(4.8, 6)
    expect(fuelDto.receiptBadgeType).toBe('fiscal')
    expect(fuelDto.isTripLinked).toBe(false)

    const rawFuelRow = repository.findByIdAndDriver(fuelDto.id, driver.id)
    expect(rawFuelRow?.amountCents).toBe(240000)
    expect(rawFuelRow?.fuelLitersDeciliters).toBe(5000)

    const maintenanceDto = service.createExpense(driver.id, {
      category: 'manutencao',
      expenseDate: '2026-09-12',
      description: 'Scania Ribeirão - Filtro',
      fuelLiters: 120,
      amountReais: 840,
      paymentMethod: 'cartao_debito',
      receiptReference: '',
    })

    expect(maintenanceDto.fuelLiters).toBeNull()
    expect(maintenanceDto.pricePerLiterReais).toBeNull()
    expect(maintenanceDto.receiptReference).toBeNull()
    expect(maintenanceDto.receiptBadgeType).toBe('simple')
    expect(
      repository.findByIdAndDriver(maintenanceDto.id, driver.id)?.fuelLitersDeciliters,
    ).toBeNull()

    expect(classifyReceiptBadge('Extrato TAG Setembro')).toBe('fiscal')
    expect(classifyReceiptBadge('nf-e 1020')).toBe('fiscal')
    expect(classifyReceiptBadge('Cupom')).toBe('simple')
    expect(classifyReceiptBadge(null)).toBe('simple')

    expect(() =>
      service.createExpense(driver.id, {
        category: 'combustivel',
        expenseDate: '2026-09-16',
        description: 'Posto sem litros',
        fuelLiters: null,
        amountReais: 500,
        paymentMethod: 'pix',
      }),
    ).toThrowError(new DomainError('VALIDATION_ERROR', FUEL_LITERS_REQUIRED_MESSAGE))
  })

  it('deve listar despesas filtradas mantendo contadores globais do mês e vínculo com viagem', async () => {
    const driver = await createTestDriver(db)
    const trip = createTestTrip(db, driver.id)

    createTestExpense(db, driver.id, {
      tripId: trip.id,
      expenseDate: '2026-09-15',
      category: 'combustivel',
      description: 'Abastecimento Percurso',
      amountCents: 240000,
      fuelLitersDeciliters: 5000,
      receiptReference: 'NF-e 10824',
    })
    createTestExpense(db, driver.id, {
      tripId: null,
      expenseDate: '2026-09-14',
      category: 'borracharia',
      description: 'Borracharia do Gaúcho',
      amountCents: 18000,
      fuelLitersDeciliters: null,
      paymentMethod: 'pix',
      receiptReference: 'Recibo',
    })
    createTestExpense(db, driver.id, {
      tripId: null,
      expenseDate: '2026-08-25',
      category: 'pedagio',
      description: 'Pedágio Agosto',
      amountCents: 9000,
      fuelLitersDeciliters: null,
      receiptReference: 'Extrato',
    })

    const allSeptember = service.listExpenses(driver.id, {
      month: '2026-09',
      category: 'todas',
    })
    expect(allSeptember.data).toHaveLength(2)
    expect(allSeptember.data[0]?.isTripLinked).toBe(true)
    expect(allSeptember.data[1]?.isTripLinked).toBe(false)
    expect(allSeptember.meta.totalCount).toBe(2)
    expect(allSeptember.meta.totalAmountReais).toBeCloseTo(2580, 10)

    const onlyFuel = service.listExpenses(driver.id, {
      month: '2026-09',
      category: 'combustivel',
    })
    expect(onlyFuel.data).toHaveLength(1)
    expect(onlyFuel.meta.totalCount).toBe(1)
    expect(onlyFuel.meta.totalAmountReais).toBeCloseTo(2400, 10)
    expect(onlyFuel.meta.countsByCategory).toEqual({
      todas: 2,
      combustivel: 1,
      pedagio: 0,
      borracharia: 1,
      manutencao: 0,
      alimentacao: 0,
      outros: 0,
    })
  })

  it('deve atualizar e excluir despesas respeitando propriedade do motorista e limpeza de litragem', async () => {
    const driver = await createTestDriver(db)
    const otherDriver = await createTestDriver(db)

    const created = service.createExpense(driver.id, {
      category: 'combustivel',
      expenseDate: '2026-09-16',
      description: 'Posto Inicial',
      fuelLiters: 400,
      amountReais: 1920,
      paymentMethod: 'cartao_frota',
      receiptReference: 'NF-e 1111',
    })

    const updated = service.updateExpense(driver.id, created.id, {
      category: 'borracharia',
      expenseDate: '2026-09-16',
      description: 'Borracharia Atualizada',
      fuelLiters: 400,
      amountReais: 220,
      paymentMethod: 'pix',
      receiptReference: 'Recibo 22',
    })
    expect(updated.category).toBe('borracharia')
    expect(updated.fuelLiters).toBeNull()
    expect(updated.pricePerLiterReais).toBeNull()
    expect(updated.receiptBadgeType).toBe('simple')

    expect(() =>
      service.updateExpense(otherDriver.id, created.id, {
        category: 'outros',
        expenseDate: '2026-09-16',
        description: 'Tentativa Indevida',
        amountReais: 50,
        paymentMethod: 'dinheiro',
      }),
    ).toThrowError(new DomainError('NOT_FOUND', EXPENSE_NOT_FOUND_MESSAGE))

    expect(() => service.deleteExpense(otherDriver.id, created.id)).toThrowError(
      new DomainError('NOT_FOUND', EXPENSE_NOT_FOUND_MESSAGE),
    )

    service.deleteExpense(driver.id, created.id)
    expect(repository.findByIdAndDriver(created.id, driver.id)).toBeUndefined()
  })
})
