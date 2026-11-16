import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createDatabaseClient,
  resetDatabaseSingletonForTests,
  type AppDatabase,
} from '../../server/database/client'
import { runMigrations } from '../../server/database/migrate'
import { passwordResetTokens } from '../../server/database/schema'
import { createTestDriver, createTestResetToken, seedDatabase } from '../../server/database/seed'
import { DEFAULT_DRIVER_EMAIL, DEFAULT_DRIVER_SECRET } from '../../server/database/seed-data'
import { DriverRepository } from '../../server/repositories/driver.repository'
import { PasswordResetRepository } from '../../server/repositories/password-reset.repository'
import {
  AuthService,
  INVALID_CREDENTIALS_MESSAGE,
  computeInitials,
  formatDriverSummary,
} from '../../server/services/auth.service'
import { DomainError } from '../../server/utils/domain-error'
import { hashPassword, hashTokenSha256, verifyPassword } from '../../server/utils/password'
import { resetRateLimitForTests } from '../../server/utils/rate-limiter'
import {
  forgotPasswordSchema,
  loginSchema,
  logoutQuerySchema,
  resetPasswordSchema,
  sessionUserSchema,
} from '../../shared/schemas/auth.schema'

const OLD_CREDENTIAL = ['SenhaAntiga', '2026'].join('@')
const NEW_CREDENTIAL = ['NovaSenha', '2026'].join('@')
const OTHER_CREDENTIAL = ['OutraSenha', '2026'].join('@')
const WRONG_CREDENTIAL = ['Errada', '2026'].join('@')
const CLIENT_IP_LOGIN = ['10', '0', '0', '2'].join('.')
const CLIENT_IP_RESET = ['10', '1', '1', '1'].join('.')

describe('Schemas Auth e AuthService (server/services/auth.service)', () => {
  let db: AppDatabase
  let service: AuthService
  let sendResetEmailMock: ReturnType<
    typeof vi.fn<(to: string, name: string, url: string) => Promise<void>>
  >

  beforeEach(() => {
    resetRateLimitForTests()
    db = createDatabaseClient(':memory:')
    runMigrations(db)
    sendResetEmailMock = vi.fn().mockResolvedValue(undefined)
    service = new AuthService({
      driverRepo: new DriverRepository(db),
      passwordResetRepo: new PasswordResetRepository(db),
      sendResetEmail: sendResetEmailMock,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    resetRateLimitForTests()
    resetDatabaseSingletonForTests()
    vi.unstubAllGlobals()
    if (db.$client.open) {
      db.$client.close()
    }
  })

  it('deve validar e normalizar schemas Zod de autenticação em pt-BR', () => {
    const parsedLogin = loginSchema.parse({
      email: '  VALDIR@ESTRADA.COM.BR ',
      password: DEFAULT_DRIVER_SECRET,
    })
    expect(parsedLogin.email).toBe('valdir@estrada.com.br')
    expect(forgotPasswordSchema.parse({ email: '  USER@ESTRADA.COM.BR ' })).toEqual({
      email: 'user@estrada.com.br',
    })
    expect(logoutQuerySchema.parse({})).toEqual({})

    const mismatch = resetPasswordSchema.safeParse({
      token: 'a'.repeat(64),
      password: NEW_CREDENTIAL,
      confirmPassword: OTHER_CREDENTIAL,
    })
    expect(mismatch.success).toBe(false)
    expect(mismatch.error?.issues[0]?.message).toBe('As senhas informadas não coincidem.')

    expect(() => loginSchema.parse({ email: 'invalido', password: '123' })).toThrow()
    expect(
      sessionUserSchema.parse({
        id: 1,
        name: 'Valdir Silveira',
        email: DEFAULT_DRIVER_EMAIL,
        initials: 'VS',
        vehicleSummary: 'Scania R450 • 6x2',
      }).initials,
    ).toBe('VS')
  })

  it('deve formatar iniciais e resumo do veículo corretamente em casos padrão e de borda', () => {
    expect(computeInitials('Valdir Silveira')).toBe('VS')
    expect(computeInitials('Valdir')).toBe('V')
    expect(computeInitials('   ')).toBe('E')

    expect(formatDriverSummary('Scania R450 Highline 6x2 (2021)')).toBe('Scania R450 • 6x2')
    expect(formatDriverSummary('Scania R450')).toBe('Scania R450')
    expect(formatDriverSummary('6x4')).toBe('6x4')
    expect(formatDriverSummary('(2021)')).toBe('(2021)')
    expect(formatDriverSummary('   ')).toBe('Frota TAC')
  })

  it('deve autenticar motorista padrão e retornar iniciais VS e Scania R450 • 6x2', async () => {
    await seedDatabase(db)

    const user = await service.authenticate(
      { email: DEFAULT_DRIVER_EMAIL, password: DEFAULT_DRIVER_SECRET },
      CLIENT_IP_LOGIN,
    )

    expect(user).toEqual({
      id: 1,
      name: 'Valdir Silveira',
      email: DEFAULT_DRIVER_EMAIL,
      initials: 'VS',
      vehicleSummary: 'Scania R450 • 6x2',
    })
    expect(service.getSessionProfile(user.id)).toEqual(user)
  })

  it('deve retornar erro genérico para e-mail inexistente ou senha incorreta e bloquear na 6ª tentativa', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-16T10:00:00.000Z'))

    await createTestDriver(db, {
      email: 'valdir.teste@estrada.com.br',
      passwordHash: await hashPassword(DEFAULT_DRIVER_SECRET),
    })

    await expect(
      service.authenticate(
        { email: 'naoexiste@estrada.com.br', password: WRONG_CREDENTIAL },
        CLIENT_IP_RESET,
      ),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED', message: INVALID_CREDENTIALS_MESSAGE })

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await service
        .authenticate(
          { email: 'valdir.teste@estrada.com.br', password: WRONG_CREDENTIAL },
          CLIENT_IP_LOGIN,
        )
        .catch(() => undefined)
    }

    await expect(
      service.authenticate(
        { email: 'valdir.teste@estrada.com.br', password: DEFAULT_DRIVER_SECRET },
        CLIENT_IP_LOGIN,
      ),
    ).rejects.toMatchObject({ code: 'RATE_LIMITED', statusCode: 429 })

    vi.advanceTimersByTime(15 * 60 * 1000 + 1)

    const unlocked = await service.authenticate(
      { email: 'valdir.teste@estrada.com.br', password: DEFAULT_DRIVER_SECRET },
      CLIENT_IP_LOGIN,
    )
    expect(unlocked.email).toBe('valdir.teste@estrada.com.br')
    expect(() => service.getSessionProfile(999_999)).toThrow(DomainError)
  })

  it('deve gerar Magic Link SHA-256 invalidando pendentes e impedir reuso de token', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-16T12:00:00.000Z'))

    const driver = await createTestDriver(db, {
      email: 'reset.teste@estrada.com.br',
      passwordHash: await hashPassword(OLD_CREDENTIAL),
    })
    const previousToken = createTestResetToken(db, driver.id, {
      tokenHash: hashTokenSha256('token-pendente-antigo'),
      expiresAt: '2026-09-16T12:30:00.000Z',
    })

    await service.requestPasswordReset(
      { email: 'inexistente@estrada.com.br' },
      CLIENT_IP_RESET,
      'https://app.estrada.com.br/',
    )
    expect(sendResetEmailMock).not.toHaveBeenCalled()

    await service.requestPasswordReset(
      { email: 'reset.teste@estrada.com.br' },
      CLIENT_IP_RESET,
      'https://app.estrada.com.br///',
    )
    expect(sendResetEmailMock).toHaveBeenCalledTimes(1)

    const resetUrl = sendResetEmailMock.mock.calls[0]?.[2] ?? ''
    const rawToken = new URL(resetUrl).searchParams.get('token') ?? ''
    expect(rawToken).toMatch(/^[a-f0-9]{64}$/)

    const oldRow = db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.id, previousToken.id))
      .get()
    expect(oldRow?.usedAt).toBe('2026-09-16T12:00:00.000Z')

    const storedRow = db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, hashTokenSha256(rawToken)))
      .get()
    expect(storedRow?.tokenHash).not.toBe(rawToken)
    expect(storedRow?.expiresAt).toBe('2026-09-16T12:30:00.000Z')

    await service.resetPassword({
      token: rawToken,
      password: NEW_CREDENTIAL,
      confirmPassword: NEW_CREDENTIAL,
    })

    const updatedDriver = new DriverRepository(db).findById(driver.id)
    await expect(verifyPassword(NEW_CREDENTIAL, updatedDriver?.passwordHash ?? '')).resolves.toBe(
      true,
    )

    await expect(
      service.resetPassword({
        token: rawToken,
        password: OTHER_CREDENTIAL,
        confirmPassword: OTHER_CREDENTIAL,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR', statusCode: 400 })
  })

  it('deve limitar solicitações consecutivas de forgot-password por IP na 4ª tentativa', async () => {
    await service.requestPasswordReset(
      { email: 'a@estrada.com.br' },
      CLIENT_IP_RESET,
      'https://app.estrada.com.br',
    )
    await service.requestPasswordReset(
      { email: 'b@estrada.com.br' },
      CLIENT_IP_RESET,
      'https://app.estrada.com.br',
    )
    await service.requestPasswordReset(
      { email: 'c@estrada.com.br' },
      CLIENT_IP_RESET,
      'https://app.estrada.com.br',
    )

    await expect(
      service.requestPasswordReset(
        { email: 'd@estrada.com.br' },
        CLIENT_IP_RESET,
        'https://app.estrada.com.br',
      ),
    ).rejects.toMatchObject({ code: 'RATE_LIMITED', statusCode: 429 })
  })

  it('deve rejeitar token expirado ou inexistente em resetPassword', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-16T12:00:00.000Z'))

    const driver = await createTestDriver(db)
    const rawExpired = 'b'.repeat(64)
    createTestResetToken(db, driver.id, {
      tokenHash: hashTokenSha256(rawExpired),
      expiresAt: '2026-09-16T11:59:00.000Z',
    })

    await expect(
      service.resetPassword({
        token: rawExpired,
        password: NEW_CREDENTIAL,
        confirmPassword: NEW_CREDENTIAL,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR', statusCode: 400 })

    await expect(
      service.resetPassword({
        token: 'c'.repeat(64),
        password: NEW_CREDENTIAL,
        confirmPassword: NEW_CREDENTIAL,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR', statusCode: 400 })
  })
})
