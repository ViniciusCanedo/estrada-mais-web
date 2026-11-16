export type LogLevel = 'info' | 'warn' | 'error'

export type LogContext = Record<string, unknown>

export interface StructuredLogEntry {
  level: LogLevel
  timestamp: string
  message: string
  [key: string]: unknown
}

export const REDACTED_VALUE = '[REDACTED]'
export const REDACTED_EMAIL = '[REDACTED_EMAIL]'

const SENSITIVE_KEYS = new Set([
  'password',
  'currentpassword',
  'newpassword',
  'confirmpassword',
  'passwordhash',
  'token',
  'tokenhash',
  'resettoken',
  'accesstoken',
  'refreshtoken',
  'cookie',
  'setcookie',
  'authorization',
  'secret',
  'appsecret',
  'smtppass',
  'pass',
  'apikey',
])

const EMAIL_KEYS = new Set(['email', 'useremail', 'driveremail', 'recipientemail'])

const EMAIL_PATTERN = /\b[a-zA-Z0-9._%+-]+@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}\b/g
const QUERY_SECRET_PATTERN =
  /([?&](?:token|password|currentPassword|newPassword|secret|code)=)[^&\s]+/gi
const BEARER_TOKEN_PATTERN = /(\bBearer\s+)\S+/gi

function normalizeKey(key: string): string {
  return key.toLowerCase().replaceAll(/[-_]/g, '')
}

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.has(normalizeKey(key))
}

function isEmailKey(key: string): boolean {
  return EMAIL_KEYS.has(normalizeKey(key))
}

/**
 * Mascara endereços de e-mail, tokens em query strings e credenciais Bearer em textos livres.
 */
export function sanitizeLogString(value: string): string {
  return value
    .replaceAll(EMAIL_PATTERN, REDACTED_EMAIL)
    .replaceAll(QUERY_SECRET_PATTERN, `$1${REDACTED_VALUE}`)
    .replaceAll(BEARER_TOKEN_PATTERN, `$1${REDACTED_VALUE}`)
}

function sanitizeRecord(record: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {}

  for (const [key, entryValue] of Object.entries(record)) {
    if (isSensitiveKey(key)) {
      sanitized[key] = REDACTED_VALUE
    } else if (isEmailKey(key)) {
      sanitized[key] = REDACTED_EMAIL
    } else {
      sanitized[key] = sanitizeLogValue(entryValue)
    }
  }

  return sanitized
}

/**
 * Sanitiza recursivamente qualquer valor antes de serializar em log estruturado (LGPD / §8).
 */
export function sanitizeLogValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return sanitizeLogString(value)
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: sanitizeLogString(value.message),
    }
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeLogValue(item))
  }

  if (typeof value === 'object' && value !== null) {
    return sanitizeRecord(value as Record<string, unknown>)
  }

  return value
}

function writeLogEntry(level: LogLevel, message: string, context?: LogContext): void {
  const sanitizedContext = context ? sanitizeRecord(context) : {}
  const entry: StructuredLogEntry = {
    ...sanitizedContext,
    level,
    timestamp: new Date().toISOString(),
    message: sanitizeLogString(message),
  }

  const serialized = `${JSON.stringify(entry)}\n`
  if (level === 'error') {
    process.stderr.write(serialized)
    return
  }

  process.stdout.write(serialized)
}

export const logger = {
  info(message: string, context?: LogContext): void {
    writeLogEntry('info', message, context)
  },
  warn(message: string, context?: LogContext): void {
    writeLogEntry('warn', message, context)
  },
  error(message: string, context?: LogContext): void {
    writeLogEntry('error', message, context)
  },
}
