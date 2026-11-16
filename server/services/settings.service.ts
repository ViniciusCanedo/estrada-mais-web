import {
  driverSettingsResponseSchema,
  type DriverSettingsResponse,
  type UpdateCredentialsInput,
  type UpdateDriverProfileInput,
  type UpdateTelemetryTargetsInput,
} from '../../shared/schemas/settings.schema'
import { fromCents, fromMilliKmL, toCents, toMilliKmL } from '../../shared/utils/units'
import type { DriverRow } from '../database/schema'
import { driverRepository, type IDriverRepository } from '../repositories/driver.repository'
import { DomainError } from '../utils/domain-error'
import { hashPassword, verifyPassword } from '../utils/password'

export const DRIVER_NOT_FOUND_MESSAGE = 'Motorista não encontrado.'
export const EMAIL_CONFLICT_MESSAGE = 'Este e-mail já está em uso por outro motorista.'
export const CURRENT_PASSWORD_REQUIRED_MESSAGE =
  'Informe a senha atual para definir uma nova senha.'
export const INVALID_CURRENT_PASSWORD_MESSAGE = 'A senha atual informada está incorreta.'

function requireDriverRow(driver: DriverRow | undefined): DriverRow {
  if (!driver) {
    throw new DomainError('NOT_FOUND', DRIVER_NOT_FOUND_MESSAGE)
  }
  return driver
}

function toDriverSettingsResponse(driver: DriverRow): DriverSettingsResponse {
  return driverSettingsResponseSchema.parse({
    id: driver.id,
    name: driver.name,
    email: driver.email,
    rntrc: driver.rntrc,
    vehicleModel: driver.vehicleModel,
    vehiclePlates: driver.vehiclePlates,
    targetConsumptionKmL: fromMilliKmL(driver.targetConsumptionMilliKml),
    maxCostPerKmReais: fromCents(driver.maxCostPerKmCents),
    updatedAt: driver.updatedAt,
  })
}

export interface SettingsServiceDependencies {
  driverRepo?: IDriverRepository
}

export interface ISettingsService {
  getSettings(driverId: number): DriverSettingsResponse
  updateProfile(driverId: number, input: UpdateDriverProfileInput): DriverSettingsResponse
  updateCredentials(
    driverId: number,
    input: UpdateCredentialsInput,
  ): Promise<DriverSettingsResponse>
  updateTelemetryTargets(
    driverId: number,
    input: UpdateTelemetryTargetsInput,
  ): DriverSettingsResponse
}

/**
 * Serviço de configurações cadastrais, alteração autenticada de credenciais e metas operacionais do motorista.
 */
export class SettingsService implements ISettingsService {
  private readonly driverRepo: IDriverRepository

  public constructor(dependencies: SettingsServiceDependencies = {}) {
    this.driverRepo = dependencies.driverRepo ?? driverRepository
  }

  public getSettings(driverId: number): DriverSettingsResponse {
    const driver = requireDriverRow(this.driverRepo.findById(driverId))
    return toDriverSettingsResponse(driver)
  }

  public updateProfile(driverId: number, input: UpdateDriverProfileInput): DriverSettingsResponse {
    const updated = requireDriverRow(
      this.driverRepo.updateProfile(driverId, {
        name: input.name.trim(),
        rntrc: input.rntrc.trim(),
        vehicleModel: input.vehicleModel.trim(),
        vehiclePlates: input.vehiclePlates.trim(),
        updatedAt: new Date().toISOString(),
      }),
    )

    return toDriverSettingsResponse(updated)
  }

  public async updateCredentials(
    driverId: number,
    input: UpdateCredentialsInput,
  ): Promise<DriverSettingsResponse> {
    const driver = requireDriverRow(this.driverRepo.findById(driverId))
    const normalizedEmail = input.email.trim().toLowerCase()
    const existingByEmail = this.driverRepo.findByEmail(normalizedEmail)

    if (existingByEmail && existingByEmail.id !== driverId) {
      throw new DomainError('CONFLICT', EMAIL_CONFLICT_MESSAGE)
    }

    const nextNewPassword = input.newPassword ?? ''
    let nextPasswordHash: string | undefined

    if (nextNewPassword.length > 0) {
      const currentPassword = input.currentPassword ?? ''
      if (currentPassword.trim().length === 0) {
        throw new DomainError('VALIDATION_ERROR', CURRENT_PASSWORD_REQUIRED_MESSAGE)
      }

      const passwordMatches = await verifyPassword(currentPassword, driver.passwordHash)
      if (!passwordMatches) {
        throw new DomainError('UNAUTHORIZED', INVALID_CURRENT_PASSWORD_MESSAGE)
      }

      nextPasswordHash = await hashPassword(nextNewPassword)
    }

    const updated = requireDriverRow(
      this.driverRepo.updateCredentials(driverId, {
        email: normalizedEmail,
        ...(nextPasswordHash !== undefined ? { passwordHash: nextPasswordHash } : {}),
        updatedAt: new Date().toISOString(),
      }),
    )

    return toDriverSettingsResponse(updated)
  }

  public updateTelemetryTargets(
    driverId: number,
    input: UpdateTelemetryTargetsInput,
  ): DriverSettingsResponse {
    const updated = requireDriverRow(
      this.driverRepo.updateTelemetryTargets(driverId, {
        targetConsumptionMilliKml: toMilliKmL(input.targetConsumptionKmL),
        maxCostPerKmCents: toCents(input.maxCostPerKmReais),
        updatedAt: new Date().toISOString(),
      }),
    )

    return toDriverSettingsResponse(updated)
  }
}

export const settingsService = new SettingsService()
