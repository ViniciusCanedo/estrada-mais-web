import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  logger,
  REDACTED_EMAIL,
  REDACTED_VALUE,
  sanitizeLogString,
  sanitizeLogValue,
} from '../../server/utils/logger'

describe('Utilitário de Logs Estruturados JSON (server/utils/logger)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('deve emitir linha JSON estruturada no stdout para nível info com metadados HTTP', () => {
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true)
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockReturnValue(true)

    logger.info('Requisição processada com sucesso', {
      requestId: 'req-001',
      method: 'POST',
      path: '/api/trips',
      statusCode: 201,
      durationMs: 12,
    })

    expect(stdoutSpy).toHaveBeenCalledTimes(1)
    expect(stderrSpy).not.toHaveBeenCalled()

    const rawLine = String(stdoutSpy.mock.calls[0]?.[0] ?? '')
    expect(rawLine.endsWith('\n')).toBe(true)

    const parsed = JSON.parse(rawLine) as Record<string, unknown>
    expect(parsed.level).toBe('info')
    expect(parsed.message).toBe('Requisição processada com sucesso')
    expect(parsed.requestId).toBe('req-001')
    expect(parsed.method).toBe('POST')
    expect(parsed.path).toBe('/api/trips')
    expect(parsed.statusCode).toBe(201)
    expect(parsed.durationMs).toBe(12)
    expect(typeof parsed.timestamp).toBe('string')
  })

  it('deve emitir linha JSON estruturada no stdout para nível warn sem contexto opcional', () => {
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true)

    logger.warn('Limite de tentativas próximo do máximo')

    expect(stdoutSpy).toHaveBeenCalledTimes(1)
    const parsed = JSON.parse(String(stdoutSpy.mock.calls[0]?.[0] ?? '')) as Record<string, unknown>
    expect(parsed.level).toBe('warn')
    expect(parsed.message).toBe('Limite de tentativas próximo do máximo')
  })

  it('deve emitir linha JSON estruturada no stderr para nível error serializando instância de Error', () => {
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true)
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockReturnValue(true)

    logger.error('Falha ao processar operação para valdir@estrada.com.br', {
      error: new Error('Erro de conexão para valdir@estrada.com.br com ?token=segredo-link'),
      primitiveError: 'falha simples',
      count: 3,
      active: false,
      empty: null,
    })

    expect(stderrSpy).toHaveBeenCalledTimes(1)
    expect(stdoutSpy).not.toHaveBeenCalled()

    const rawLine = String(stderrSpy.mock.calls[0]?.[0] ?? '')
    expect(rawLine).not.toContain('valdir@estrada.com.br')
    expect(rawLine).not.toContain('segredo-link')

    const parsed = JSON.parse(rawLine) as {
      level: string
      message: string
      error: { name: string; message: string }
      count: number
      active: boolean
      empty: null
    }
    expect(parsed.level).toBe('error')
    expect(parsed.message).toBe(`Falha ao processar operação para ${REDACTED_EMAIL}`)
    expect(parsed.error).toEqual({
      name: 'Error',
      message: `Erro de conexão para ${REDACTED_EMAIL} com ?token=${REDACTED_VALUE}`,
    })
    expect(parsed.count).toBe(3)
    expect(parsed.active).toBe(false)
    expect(parsed.empty).toBeNull()
  })

  it('deve redactar recursivamente senhas, tokens, cookies, headers authorization e e-mails em objetos aninhados e arrays', () => {
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true)
    const plainCredential = 'valor-credencial-plana'
    const currentCredential = 'valor-credencial-atual'
    const nextCredential = 'valor-nova-credencial'
    const hashedCredential = 'valor-hash-scrypt'

    logger.info('Auditoria de tentativa de autenticação de motorista@estrada.com.br', {
      password: plainCredential,
      currentPassword: currentCredential,
      newPassword: nextCredential,
      passwordHash: hashedCredential,
      token: 'token-recuperacao-secreto',
      tokenHash: 'sha256-token-interno',
      cookie: 'estrada-session=valor-cookie-secreto',
      authorization: 'Bearer credencial-secreta',
      secret: 'chave-secreta-interna',
      email: 'motorista@estrada.com.br',
      nested: {
        user_email: 'outro.motorista@transporte.org.br',
        reset_token: 'token-aninhado-secreto',
        set_cookie: 'sessao=123',
        notes: [
          'Contato principal: suporte@estrada.com.br',
          {
            apiKey: 'chave-integracao',
            header: 'Bearer sessao-array',
            resetLink: 'https://app.estrada.com.br/reset-password?token=abc-123&mode=fast',
          },
        ],
      },
    })

    const rawLine = String(stdoutSpy.mock.calls[0]?.[0] ?? '')
    expect(rawLine).not.toContain(plainCredential)
    expect(rawLine).not.toContain(currentCredential)
    expect(rawLine).not.toContain(nextCredential)
    expect(rawLine).not.toContain(hashedCredential)
    expect(rawLine).not.toContain('token-recuperacao-secreto')
    expect(rawLine).not.toContain('sha256-token-interno')
    expect(rawLine).not.toContain('valor-cookie-secreto')
    expect(rawLine).not.toContain('credencial-secreta')
    expect(rawLine).not.toContain('chave-secreta-interna')
    expect(rawLine).not.toContain('motorista@estrada.com.br')
    expect(rawLine).not.toContain('outro.motorista@transporte.org.br')
    expect(rawLine).not.toContain('suporte@estrada.com.br')
    expect(rawLine).not.toContain('token-aninhado-secreto')
    expect(rawLine).not.toContain('abc-123')

    const parsed = JSON.parse(rawLine) as Record<string, unknown>
    expect(parsed.password).toBe(REDACTED_VALUE)
    expect(parsed.currentPassword).toBe(REDACTED_VALUE)
    expect(parsed.newPassword).toBe(REDACTED_VALUE)
    expect(parsed.passwordHash).toBe(REDACTED_VALUE)
    expect(parsed.token).toBe(REDACTED_VALUE)
    expect(parsed.tokenHash).toBe(REDACTED_VALUE)
    expect(parsed.cookie).toBe(REDACTED_VALUE)
    expect(parsed.authorization).toBe(REDACTED_VALUE)
    expect(parsed.secret).toBe(REDACTED_VALUE)
    expect(parsed.email).toBe(REDACTED_EMAIL)
  })

  it('deve expor funções puras sanitizeLogString e sanitizeLogValue para mascaramento direto', () => {
    expect(
      sanitizeLogString('E-mail: tac@estrada.com.br | Link: /reset?token=xyz987 | Bearer meu-jwt'),
    ).toBe(
      `E-mail: ${REDACTED_EMAIL} | Link: /reset?token=${REDACTED_VALUE} | Bearer ${REDACTED_VALUE}`,
    )

    expect(
      sanitizeLogValue({
        driverEmail: 'tac@estrada.com.br',
        smtpPass: 'segredo-smtp',
        ok: true,
      }),
    ).toEqual({
      driverEmail: REDACTED_EMAIL,
      smtpPass: REDACTED_VALUE,
      ok: true,
    })
  })
})
