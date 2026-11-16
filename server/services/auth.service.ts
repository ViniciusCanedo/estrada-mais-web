import { randomBytes } from 'node:crypto'
import {
  sessionUserSchema,
  type ForgotPasswordInput,
  type LoginInput,
  type ResetPasswordInput,
  type SessionUser,
} from '../../shared/schemas/auth.schema'
import type { DriverRow } from '../database/schema'
import { driverRepository, type IDriverRepository } from '../repositories/driver.repository'
import {
  passwordResetRepository,
  type IPasswordResetRepository,
} from '../repositories/password-reset.repository'
import { DomainError } from '../utils/domain-error'
import { sendPasswordResetEmail } from '../utils/mailer'
import { hashPassword, hashTokenSha256, verifyPassword } from '../utils/password'
import {
  FORGOT_MAX_REQUESTS,
  LOGIN_MAX_FAILURES,
  buildForgotRateLimitKey,
  buildLoginRateLimitKey,
  checkRateLimit,
  clearRateLimitKey,
  formatRetryAfterPtBr,
  recordRateLimitAttempt,
} from '../utils/rate-limiter'

export const INVALID_CREDENTIALS_MESSAGE = 'E-mail ou senha inválidos.'
export const RESET_REQUEST_NEUTRAL_MESSAGE =
  'Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha em instantes.'
export const RESET_PASSWORD_SUCCESS_MESSAGE = 'Senha redefinida com sucesso.'
export const INVALID_RESET_TOKEN_MESSAGE =
  'Token de recuperação inválido, expirado ou já utilizado.'

const RESET_TOKEN_BYTES = 32
const RESET_TOKEN_EXPIRY_MS = 30 * 60 * 1000

let dummyPasswordHashPromise: Promise<string> | null = null

function getDummyPasswordHash(): Promise<string> {
  if (!dummyPasswordHashPromise) {
    dummyPasswordHashPromise = hashPassword('estrada-timing-mitigation-placeholder')
  }
  return dummyPasswordHashPromise
}

function trimTrailingSlashes(value: string): string {
  let end = value.length
  while (end > 0 && value.charAt(end - 1) === '/') {
    end -= 1
  }
  return value.slice(0, end)
}

/**
 * Calcula as iniciais do motorista para exibição no avatar da Sidebar.
 */
export function computeInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) {
    return 'E'
  }

  const first = parts[0]?.[0] ?? 'E'
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return `${first}${last}`.toUpperCase()
}

/**
 * Resume o modelo do veículo para exibição compacta na Sidebar (ex.: "Scania R450 • 6x2").
 */
export function formatDriverSummary(vehicleModel: string): string {
  const trimmed = vehicleModel.trim()
  if (trimmed.length === 0) {
    return 'Frota TAC'
  }

  const withoutYear = trimmed.replace(/\(\d{4}\)/g, ' ')
  const tractionMatch = /\b(\d+x\d+)\b/i.exec(withoutYear)
  const traction = tractionMatch?.[1]?.toLowerCase() ?? ''
  const modelSource = tractionMatch ? withoutYear.replace(tractionMatch[0], ' ') : withoutYear
  const modelLabel = modelSource.trim().split(/\s+/).filter(Boolean).slice(0, 2).join(' ')

  if (modelLabel && traction) {
    return `${modelLabel} • ${traction}`
  }

  return modelLabel || traction || trimmed
}

export interface AuthServiceDependencies {
  driverRepo?: IDriverRepository
  passwordResetRepo?: IPasswordResetRepository
  sendResetEmail?: (to: string, driverName: string, resetUrl: string) => Promise<void>
}

export interface IAuthService {
  authenticate(input: LoginInput, clientIp: string): Promise<SessionUser>
  getSessionProfile(driverId: number): SessionUser
  requestPasswordReset(
    input: ForgotPasswordInput,
    clientIp: string,
    appBaseUrl: string,
  ): Promise<void>
  resetPassword(input: ResetPasswordInput): Promise<void>
}

/**
 * Serviço de autenticação, sessão do motorista, rate limit e recuperação por Magic Link.
 */
export class AuthService implements IAuthService {
  private readonly driverRepo: IDriverRepository
  private readonly passwordResetRepo: IPasswordResetRepository
  private readonly sendResetEmail: (
    to: string,
    driverName: string,
    resetUrl: string,
  ) => Promise<void>

  public constructor(dependencies: AuthServiceDependencies = {}) {
    this.driverRepo = dependencies.driverRepo ?? driverRepository
    this.passwordResetRepo = dependencies.passwordResetRepo ?? passwordResetRepository
    this.sendResetEmail = dependencies.sendResetEmail ?? sendPasswordResetEmail
  }

  private toSessionUser(driver: DriverRow): SessionUser {
    return sessionUserSchema.parse({
      id: driver.id,
      name: driver.name,
      email: driver.email,
      initials: computeInitials(driver.name),
      vehicleSummary: formatDriverSummary(driver.vehicleModel),
    })
  }

  public async authenticate(input: LoginInput, clientIp: string): Promise<SessionUser> {
    const normalizedEmail = input.email.trim().toLowerCase()
    const rateKey = buildLoginRateLimitKey(clientIp, normalizedEmail)
    const limitStatus = checkRateLimit(rateKey, LOGIN_MAX_FAILURES)

    if (!limitStatus.allowed) {
      throw new DomainError(
        'RATE_LIMITED',
        `Muitas tentativas de login. Tente novamente em ${formatRetryAfterPtBr(limitStatus.retryAfterMs)}.`,
      )
    }

    const driver = this.driverRepo.findByEmail(normalizedEmail)
    if (!driver) {
      // Executa verificação dummy com scrypt para manter tempo equivalente e impedir enumeração de contas.
      await verifyPassword(input.password, await getDummyPasswordHash())
      recordRateLimitAttempt(rateKey)
      throw new DomainError('UNAUTHORIZED', INVALID_CREDENTIALS_MESSAGE)
    }

    const passwordMatches = await verifyPassword(input.password, driver.passwordHash)
    if (!passwordMatches) {
      recordRateLimitAttempt(rateKey)
      throw new DomainError('UNAUTHORIZED', INVALID_CREDENTIALS_MESSAGE)
    }

    clearRateLimitKey(rateKey)
    return this.toSessionUser(driver)
  }

  public getSessionProfile(driverId: number): SessionUser {
    const driver = this.driverRepo.findById(driverId)
    if (!driver) {
      throw new DomainError('UNAUTHORIZED', 'Sessão expirada ou não autenticada.')
    }

    return this.toSessionUser(driver)
  }

  public async requestPasswordReset(
    input: ForgotPasswordInput,
    clientIp: string,
    appBaseUrl: string,
  ): Promise<void> {
    const rateKey = buildForgotRateLimitKey(clientIp)
    const limitStatus = checkRateLimit(rateKey, FORGOT_MAX_REQUESTS)

    if (!limitStatus.allowed) {
      throw new DomainError(
        'RATE_LIMITED',
        `Muitas solicitações de recuperação de senha. Tente novamente em ${formatRetryAfterPtBr(limitStatus.retryAfterMs)}.`,
      )
    }

    recordRateLimitAttempt(rateKey)

    const driver = this.driverRepo.findByEmail(input.email.trim().toLowerCase())
    if (!driver) {
      return
    }

    const now = new Date()
    const nowIso = now.toISOString()
    const expiresAt = new Date(now.getTime() + RESET_TOKEN_EXPIRY_MS).toISOString()

    this.passwordResetRepo.invalidatePendingByDriver(driver.id, nowIso)

    const rawToken = randomBytes(RESET_TOKEN_BYTES).toString('hex')
    const tokenHash = hashTokenSha256(rawToken)
    this.passwordResetRepo.createToken({
      driverId: driver.id,
      tokenHash,
      expiresAt,
      createdAt: nowIso,
    })

    const cleanBaseUrl = trimTrailingSlashes(appBaseUrl)
    const resetUrl = `${cleanBaseUrl}/reset-password?token=${rawToken}`
    await this.sendResetEmail(driver.email, driver.name, resetUrl)
  }

  public async resetPassword(input: ResetPasswordInput): Promise<void> {
    const nowIso = new Date().toISOString()
    const tokenHash = hashTokenSha256(input.token.trim())
    const tokenRow = this.passwordResetRepo.findValidByHash(tokenHash, nowIso)

    if (!tokenRow) {
      throw new DomainError('VALIDATION_ERROR', INVALID_RESET_TOKEN_MESSAGE)
    }

    const newPasswordHash = await hashPassword(input.password)
    this.driverRepo.updatePasswordHash(tokenRow.driverId, newPasswordHash, nowIso)
    this.passwordResetRepo.markAsUsed(tokenRow.id, nowIso)
  }
}

export const authService = new AuthService()
