import { and, eq, gt, isNull } from 'drizzle-orm'
import { getDatabase, type AppDatabase } from '../database/client'
import { passwordResetTokens, type PasswordResetTokenRow } from '../database/schema'

export interface CreatePasswordResetTokenInput {
  driverId: number
  tokenHash: string
  expiresAt: string
  createdAt: string
}

export interface IPasswordResetRepository {
  invalidatePendingByDriver(driverId: number, usedAt: string): void
  createToken(input: CreatePasswordResetTokenInput): void
  findValidByHash(tokenHash: string, nowIso: string): PasswordResetTokenRow | undefined
  markAsUsed(id: number, usedAt: string): void
}

/**
 * Repositório responsável pelo ciclo de vida dos tokens SHA-256 de recuperação de senha.
 */
export class PasswordResetRepository implements IPasswordResetRepository {
  public constructor(private readonly database?: AppDatabase) {}

  private resolveDb(): AppDatabase {
    return this.database ?? getDatabase()
  }

  public invalidatePendingByDriver(driverId: number, usedAt: string): void {
    this.resolveDb()
      .update(passwordResetTokens)
      .set({ usedAt })
      .where(and(eq(passwordResetTokens.driverId, driverId), isNull(passwordResetTokens.usedAt)))
      .run()
  }

  public createToken(input: CreatePasswordResetTokenInput): void {
    this.resolveDb()
      .insert(passwordResetTokens)
      .values({
        driverId: input.driverId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        usedAt: null,
        createdAt: input.createdAt,
      })
      .run()
  }

  public findValidByHash(tokenHash: string, nowIso: string): PasswordResetTokenRow | undefined {
    return this.resolveDb()
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.tokenHash, tokenHash),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, nowIso),
        ),
      )
      .get()
  }

  public markAsUsed(id: number, usedAt: string): void {
    this.resolveDb()
      .update(passwordResetTokens)
      .set({ usedAt })
      .where(and(eq(passwordResetTokens.id, id), isNull(passwordResetTokens.usedAt)))
      .run()
  }
}

export const passwordResetRepository = new PasswordResetRepository()
