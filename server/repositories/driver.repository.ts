import { eq } from 'drizzle-orm'
import { getDatabase, type AppDatabase } from '../database/client'
import { drivers, type DriverRow } from '../database/schema'

export interface UpdateDriverProfileData {
  name: string
  rntrc: string
  vehicleModel: string
  vehiclePlates: string
  updatedAt: string
}

export interface UpdateDriverCredentialsData {
  email: string
  passwordHash?: string
  updatedAt: string
}

export interface UpdateTelemetryTargetsData {
  targetConsumptionMilliKml: number
  maxCostPerKmCents: number
  updatedAt: string
}

export interface IDriverRepository {
  findByEmail(email: string): DriverRow | undefined
  findById(id: number): DriverRow | undefined
  updatePasswordHash(driverId: number, passwordHash: string, updatedAt: string): void
  updateProfile(id: number, data: UpdateDriverProfileData): DriverRow | undefined
  updateCredentials(id: number, data: UpdateDriverCredentialsData): DriverRow | undefined
  updateTelemetryTargets(id: number, data: UpdateTelemetryTargetsData): DriverRow | undefined
}

/**
 * Repositório responsável pelas consultas e atualizações de cadastro, credenciais e metas na tabela drivers.
 */
export class DriverRepository implements IDriverRepository {
  public constructor(private readonly database?: AppDatabase) {}

  private resolveDb(): AppDatabase {
    return this.database ?? getDatabase()
  }

  private updateDriverRow(
    id: number,
    values: Partial<typeof drivers.$inferInsert>,
  ): DriverRow | undefined {
    return this.resolveDb().update(drivers).set(values).where(eq(drivers.id, id)).returning().get()
  }

  public findByEmail(email: string): DriverRow | undefined {
    const normalizedEmail = email.trim().toLowerCase()
    return this.resolveDb().select().from(drivers).where(eq(drivers.email, normalizedEmail)).get()
  }

  public findById(id: number): DriverRow | undefined {
    return this.resolveDb().select().from(drivers).where(eq(drivers.id, id)).get()
  }

  public updatePasswordHash(driverId: number, passwordHash: string, updatedAt: string): void {
    this.updateDriverRow(driverId, { passwordHash, updatedAt })
  }

  public updateProfile(id: number, data: UpdateDriverProfileData): DriverRow | undefined {
    return this.updateDriverRow(id, {
      name: data.name,
      rntrc: data.rntrc,
      vehicleModel: data.vehicleModel,
      vehiclePlates: data.vehiclePlates,
      updatedAt: data.updatedAt,
    })
  }

  public updateCredentials(id: number, data: UpdateDriverCredentialsData): DriverRow | undefined {
    const normalizedEmail = data.email.trim().toLowerCase()
    const values =
      data.passwordHash !== undefined
        ? { email: normalizedEmail, passwordHash: data.passwordHash, updatedAt: data.updatedAt }
        : { email: normalizedEmail, updatedAt: data.updatedAt }

    return this.updateDriverRow(id, values)
  }

  public updateTelemetryTargets(
    id: number,
    data: UpdateTelemetryTargetsData,
  ): DriverRow | undefined {
    return this.updateDriverRow(id, {
      targetConsumptionMilliKml: data.targetConsumptionMilliKml,
      maxCostPerKmCents: data.maxCostPerKmCents,
      updatedAt: data.updatedAt,
    })
  }
}

export const driverRepository = new DriverRepository()
