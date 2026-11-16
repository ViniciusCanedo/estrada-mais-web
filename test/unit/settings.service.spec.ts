import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createDatabaseClient,
  resetDatabaseSingletonForTests,
  type AppDatabase,
} from '../../server/database/client'
import { runMigrations } from '../../server/database/migrate'
import { createTestDriver, seedDatabase } from '../../server/database/seed'
import { DEFAULT_DRIVER_EMAIL } from '../../server/database/seed-data'
import { DriverRepository } from '../../server/repositories/driver.repository'
import {
  CURRENT_PASSWORD_REQUIRED_MESSAGE,
  DRIVER_NOT_FOUND_MESSAGE,
  EMAIL_CONFLICT_MESSAGE,
  INVALID_CURRENT_PASSWORD_MESSAGE,
  SettingsService,
} from '../../server/services/settings.service'
import { DomainError } from '../../server/utils/domain-error'
import { hashPassword, verifyPassword } from '../../server/utils/password'
import {
  driverSettingsResponseSchema,
  updateCredentialsSchema,
  updateDriverProfileSchema,
  updateTelemetryTargetsSchema,
} from '../../shared/schemas/settings.schema'
import { computeInitials, formatDriverSummary } from '../../shared/utils/driver-profile'

const CURRENT_CREDENTIAL = ['SenhaAtual', '2026'].join('@')
const NEW_CREDENTIAL = ['NovaSenhaCfg', '2026'].join('@')
const WRONG_CREDENTIAL = ['SenhaErradaCfg', '2026'].join('@')

describe('Schemas Settings e SettingsService (server/services/settings.service)', () => {
  let db: AppDatabase
  let repository: DriverRepository
  let service: SettingsService

  beforeEach(() => {
    db = createDatabaseClient(':memory:')
    runMigrations(db)
    repository = new DriverRepository(db)
    service = new SettingsService({ driverRepo: repository })
  })

  afterEach(() => {
    resetDatabaseSingletonForTests()
    vi.unstubAllGlobals()
    if (db.$client.open) {
      db.$client.close()
    }
  })

  it('deve validar limites e refinamentos dos schemas Zod em shared/schemas/settings.schema.ts', () => {
    const validProfile = updateDriverProfileSchema.parse({
      name: '  Valdir Silveira  ',
      rntrc: '  58.912.440-TAC ',
      vehicleModel: ' Scania R450 Highline 6x2 (2021) ',
      vehiclePlates: ' BRA-2E19 / CUR-4901 ',
    })
    expect(validProfile.name).toBe('Valdir Silveira')
    expect(() =>
      updateDriverProfileSchema.parse({
        name: 'AB',
        rntrc: '123',
        vehicleModel: 'AB',
        vehiclePlates: 'BRA',
      }),
    ).toThrow()

    const emailOnly = updateCredentialsSchema.parse({
      email: '  VALDIR.NOVO@ESTRADA.COM.BR ',
      currentPassword: '',
      newPassword: '',
    })
    expect(emailOnly.email).toBe('valdir.novo@estrada.com.br')

    const missingCurrent = updateCredentialsSchema.safeParse({
      email: 'valdir@estrada.com.br',
      currentPassword: '   ',
      newPassword: NEW_CREDENTIAL,
    })
    expect(missingCurrent.success).toBe(false)
    expect(missingCurrent.error?.issues[0]?.message).toBe(
      'Informe a senha atual para definir uma nova senha.',
    )

    const shortNewPassword = updateCredentialsSchema.safeParse({
      email: 'valdir@estrada.com.br',
      currentPassword: CURRENT_CREDENTIAL,
      newPassword: '123',
    })
    expect(shortNewPassword.success).toBe(false)

    expect(
      updateTelemetryTargetsSchema.parse({ targetConsumptionKmL: 1.8, maxCostPerKmReais: 3.5 }),
    ).toEqual({ targetConsumptionKmL: 1.8, maxCostPerKmReais: 3.5 })
    expect(
      updateTelemetryTargetsSchema.parse({ targetConsumptionKmL: 3.2, maxCostPerKmReais: 7.0 }),
    ).toEqual({ targetConsumptionKmL: 3.2, maxCostPerKmReais: 7.0 })

    expect(
      updateTelemetryTargetsSchema.safeParse({
        targetConsumptionKmL: 1.75,
        maxCostPerKmReais: 5.1,
      }).success,
    ).toBe(false)
    expect(
      updateTelemetryTargetsSchema.safeParse({
        targetConsumptionKmL: 3.25,
        maxCostPerKmReais: 5.1,
      }).success,
    ).toBe(false)
    expect(
      updateTelemetryTargetsSchema.safeParse({
        targetConsumptionKmL: 2.35,
        maxCostPerKmReais: 3.4,
      }).success,
    ).toBe(false)
    expect(
      updateTelemetryTargetsSchema.safeParse({
        targetConsumptionKmL: 2.35,
        maxCostPerKmReais: 7.1,
      }).success,
    ).toBe(false)

    const parsedResponse = driverSettingsResponseSchema.parse({
      id: 1,
      name: 'Valdir Silveira',
      email: DEFAULT_DRIVER_EMAIL,
      rntrc: '58.912.440-TAC',
      vehicleModel: 'Scania R450 Highline 6x2 (2021)',
      vehiclePlates: 'BRA-2E19 / CUR-4901',
      targetConsumptionKmL: 2.35,
      maxCostPerKmReais: 5.1,
      updatedAt: '2026-09-16T12:00:00.000Z',
    })
    expect(parsedResponse.maxCostPerKmReais).toBeCloseTo(5.1, 10)
  })

  it('deve carregar configurações, atualizar perfil e calcular iniciais/resumo do veículo', async () => {
    await seedDatabase(db)

    const initial = service.getSettings(1)
    expect(initial.targetConsumptionKmL).toBeCloseTo(2.35, 10)
    expect(initial.maxCostPerKmReais).toBeCloseTo(5.1, 10)

    const updated = service.updateProfile(1, {
      name: 'Carlos Eduardo',
      rntrc: '77.888.999-TAC',
      vehicleModel: 'Scania R450 Highline 6x2 (2021)',
      vehiclePlates: 'ABC-1D23 / DEF-4567',
    })

    expect(updated.name).toBe('Carlos Eduardo')
    expect(computeInitials(updated.name)).toBe('CE')
    expect(formatDriverSummary(updated.vehicleModel)).toBe('Scania R450 • 6x2')

    expect(() => service.getSettings(999_999)).toThrowError(
      new DomainError('NOT_FOUND', DRIVER_NOT_FOUND_MESSAGE),
    )
    expect(() =>
      service.updateProfile(999_999, {
        name: 'Motorista',
        rntrc: '12345',
        vehicleModel: 'Volvo FH',
        vehiclePlates: 'AAA-1234',
      }),
    ).toThrow(DomainError)
  })

  it('deve persistir metas operacionais com precisão inteira exata sem erro de ponto flutuante', async () => {
    const driver = await createTestDriver(db)

    const savedDefaults = service.updateTelemetryTargets(driver.id, {
      targetConsumptionKmL: 2.35,
      maxCostPerKmReais: 5.1,
    })
    expect(savedDefaults.targetConsumptionKmL).toBeCloseTo(2.35, 10)
    expect(savedDefaults.maxCostPerKmReais).toBeCloseTo(5.1, 10)

    const rawRow = repository.findById(driver.id)
    expect(rawRow?.targetConsumptionMilliKml).toBe(2350)
    expect(rawRow?.maxCostPerKmCents).toBe(510)

    const savedCustom = service.updateTelemetryTargets(driver.id, {
      targetConsumptionKmL: 2.85,
      maxCostPerKmReais: 6.3,
    })
    expect(savedCustom.targetConsumptionKmL).toBeCloseTo(2.85, 10)
    expect(savedCustom.maxCostPerKmReais).toBeCloseTo(6.3, 10)
    expect(repository.findById(driver.id)?.targetConsumptionMilliKml).toBe(2850)
    expect(repository.findById(driver.id)?.maxCostPerKmCents).toBe(630)
  })

  it('deve validar colisão de e-mail (409), exigir senha atual (400/401) e gravar novo hash scrypt', async () => {
    const driverA = await createTestDriver(db, {
      email: 'motorista.a@estrada.com.br',
      passwordHash: await hashPassword(CURRENT_CREDENTIAL),
    })
    await createTestDriver(db, {
      email: 'motorista.b@estrada.com.br',
    })

    await expect(
      service.updateCredentials(driverA.id, {
        email: '  MOTORISTA.B@ESTRADA.COM.BR ',
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT', statusCode: 409, message: EMAIL_CONFLICT_MESSAGE })

    await expect(
      service.updateCredentials(driverA.id, {
        email: 'motorista.a@estrada.com.br',
        newPassword: NEW_CREDENTIAL,
      }),
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      statusCode: 400,
      message: CURRENT_PASSWORD_REQUIRED_MESSAGE,
    })

    await expect(
      service.updateCredentials(driverA.id, {
        email: 'motorista.a@estrada.com.br',
        currentPassword: WRONG_CREDENTIAL,
        newPassword: NEW_CREDENTIAL,
      }),
    ).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      statusCode: 401,
      message: INVALID_CURRENT_PASSWORD_MESSAGE,
    })

    const onlyEmail = await service.updateCredentials(driverA.id, {
      email: 'novo.a@estrada.com.br',
      currentPassword: '',
      newPassword: '',
    })
    expect(onlyEmail.email).toBe('novo.a@estrada.com.br')
    const afterEmailOnly = repository.findById(driverA.id)
    await expect(
      verifyPassword(CURRENT_CREDENTIAL, afterEmailOnly?.passwordHash ?? ''),
    ).resolves.toBe(true)

    const updatedBoth = await service.updateCredentials(driverA.id, {
      email: 'final.a@estrada.com.br',
      currentPassword: CURRENT_CREDENTIAL,
      newPassword: NEW_CREDENTIAL,
    })
    expect(updatedBoth.email).toBe('final.a@estrada.com.br')

    const afterBoth = repository.findById(driverA.id)
    await expect(verifyPassword(NEW_CREDENTIAL, afterBoth?.passwordHash ?? '')).resolves.toBe(true)
    await expect(verifyPassword(CURRENT_CREDENTIAL, afterBoth?.passwordHash ?? '')).resolves.toBe(
      false,
    )
  })
})
