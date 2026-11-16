import { createError, isError } from 'h3'
import type { DomainErrorCode } from '../../shared/types/domain'

interface HttpErrorMapping {
  readonly statusCode: number
  readonly statusMessage: string
}

const DOMAIN_ERROR_HTTP_MAP: Record<DomainErrorCode, HttpErrorMapping> = {
  VALIDATION_ERROR: { statusCode: 400, statusMessage: 'Bad Request' },
  UNAUTHORIZED: { statusCode: 401, statusMessage: 'Unauthorized' },
  FORBIDDEN: { statusCode: 403, statusMessage: 'Forbidden' },
  NOT_FOUND: { statusCode: 404, statusMessage: 'Not Found' },
  CONFLICT: { statusCode: 409, statusMessage: 'Conflict' },
  RATE_LIMITED: { statusCode: 429, statusMessage: 'Too Many Requests' },
  SERVICE_UNAVAILABLE: { statusCode: 503, statusMessage: 'Service Unavailable' },
}

/**
 * Erro semântico de domínio lançado pelos services e convertido em HTTP na borda da API.
 */
export class DomainError extends Error {
  public readonly code: DomainErrorCode
  public readonly statusCode: number
  public readonly statusMessage: string

  public constructor(code: DomainErrorCode, message: string) {
    super(message)
    this.name = 'DomainError'
    this.code = code
    const mapping = DOMAIN_ERROR_HTTP_MAP[code]
    this.statusCode = mapping.statusCode
    this.statusMessage = mapping.statusMessage
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/**
 * Converte erros de domínio ou falhas inesperadas em H3Error na borda HTTP sem vazar detalhes internos.
 */
export function handleServiceError(error: unknown): never {
  if (error instanceof DomainError) {
    throw createError({
      statusCode: error.statusCode,
      statusMessage: error.statusMessage,
      message: error.message,
      data: { code: error.code },
    })
  }

  if (isError(error)) {
    throw error
  }

  throw createError({
    statusCode: 500,
    statusMessage: 'Internal Server Error',
    message: 'Ocorreu um erro interno inesperado.',
  })
}
