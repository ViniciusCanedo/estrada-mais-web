import { eq } from 'drizzle-orm'
import { getDatabase, type AppDatabase } from '../database/client'
import { drivers, type DriverRow } from '../database/schema'

export interface IDriverRepository {
  findByEmail(email: string): DriverRow | undefined
  findById(id: number): DriverRow | undefined
  updatePasswordHash(driverId: number, passwordHash: string, updatedAt: string): void
}

/**
 * Repositório responsável pelas consultas e atualização de credenciais na tabela drivers.
 */
export class DriverRepository implements IDriverRepository {
  public constructor(private readonly database?: AppDatabase) {}

  private resolveDb(): AppDatabase {
    return this.database ?? getDatabase()
  }

  public findByEmail(email: string): DriverRow | undefined {
    const normalizedEmail = email.trim().toLowerCase()
    return this.resolveDb().select().from(drivers).where(eq(drivers.email, normalizedEmail)).get()
  }

  public findById(id: number): DriverRow | undefined {
    return this.resolveDb().select().from(drivers).where(eq(drivers.id, id)).get()
  }

  public updatePasswordHash(driverId: number, passwordHash: string, updatedAt: string): void {
    this.resolveDb()
      .update(drivers)
      .set({ passwordHash, updatedAt })
      .where(eq(drivers.id, driverId))
      .run()
  }
}

export const driverRepository = new DriverRepository()
