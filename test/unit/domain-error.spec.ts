import { createError, isError } from 'h3'
import { describe, expect, it } from 'vitest'
import { DomainError, handleServiceError } from '../../server/utils/domain-error'
import type { DomainErrorCode } from '../../shared/types/domain'

function captureThrown(action: () => never): unknown {
  try {
    action()
  } catch (thrown: unknown) {
    return thrown
  }
  throw new Error('Era esperado que a função lançasse uma exceção.')
}

describe('Erros de Domínio e Mapeamento HTTP (server/utils/domain-error)', () => {
  it('deve construir DomainError preservando herança, código, status HTTP e mensagem', () => {
    const domainError = new DomainError(
      'VALIDATION_ERROR',
      'Quilometragem final deve ser maior que a inicial.',
    )

    expect(domainError).toBeInstanceOf(Error)
    expect(domainError).toBeInstanceOf(DomainError)
    expect(domainError.name).toBe('DomainError')
    expect(domainError.code).toBe('VALIDATION_ERROR')
    expect(domainError.statusCode).toBe(400)
    expect(domainError.statusMessage).toBe('Bad Request')
    expect(domainError.message).toBe('Quilometragem final deve ser maior que a inicial.')
  })

  it.each<{
    code: DomainErrorCode
    expectedStatusCode: number
    expectedStatusMessage: string
    message: string
  }>([
    {
      code: 'VALIDATION_ERROR',
      expectedStatusCode: 400,
      expectedStatusMessage: 'Bad Request',
      message: 'Dados informados são inválidos.',
    },
    {
      code: 'UNAUTHORIZED',
      expectedStatusCode: 401,
      expectedStatusMessage: 'Unauthorized',
      message: 'Sessão expirada ou não autenticada.',
    },
    {
      code: 'FORBIDDEN',
      expectedStatusCode: 403,
      expectedStatusMessage: 'Forbidden',
      message: 'Acesso negado a este recurso.',
    },
    {
      code: 'NOT_FOUND',
      expectedStatusCode: 404,
      expectedStatusMessage: 'Not Found',
      message: 'Registro não encontrado.',
    },
    {
      code: 'CONFLICT',
      expectedStatusCode: 409,
      expectedStatusMessage: 'Conflict',
      message: 'Já existe um registro com esses dados.',
    },
    {
      code: 'RATE_LIMITED',
      expectedStatusCode: 429,
      expectedStatusMessage: 'Too Many Requests',
      message: 'Muitas tentativas em sequência. Aguarde alguns minutos.',
    },
    {
      code: 'SERVICE_UNAVAILABLE',
      expectedStatusCode: 503,
      expectedStatusMessage: 'Service Unavailable',
      message: 'Banco de dados indisponível.',
    },
  ])(
    'deve mapear $code para HTTP $expectedStatusCode ($expectedStatusMessage)',
    ({ code, expectedStatusCode, expectedStatusMessage, message }) => {
      const domainError = new DomainError(code, message)

      const thrown = captureThrown(() => handleServiceError(domainError))

      expect(isError(thrown)).toBe(true)
      expect(thrown).toMatchObject({
        statusCode: expectedStatusCode,
        statusMessage: expectedStatusMessage,
        message,
        data: { code },
      })
    },
  )

  it('deve preservar instância existente de H3Error sem sobrescrever status ou dados', () => {
    const existingHttpError = createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Falha de validação de entrada.',
      data: { issues: ['kmEnd'] },
    })

    const thrown = captureThrown(() => handleServiceError(existingHttpError))

    expect(thrown).toBe(existingHttpError)
    expect(isError(thrown)).toBe(true)
    expect(thrown).toMatchObject({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Falha de validação de entrada.',
      data: { issues: ['kmEnd'] },
    })
  })

  it('deve encapsular Error genérico em HTTP 500 sem vazar detalhes internos', () => {
    const infraError = new Error('SQLITE_CORRUPT: tabela drivers indisponivel em /var/lib/db')

    const thrown = captureThrown(() => handleServiceError(infraError))

    expect(isError(thrown)).toBe(true)
    expect(thrown).toMatchObject({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Ocorreu um erro interno inesperado.',
    })
    expect(String(thrown)).not.toContain('SQLITE_CORRUPT')
    expect(String(thrown)).not.toContain('/var/lib/db')
  })

  it('deve encapsular valores desconhecidos não-Error em HTTP 500 genérico', () => {
    const thrown = captureThrown(() => handleServiceError('erro inesperado de infraestrutura'))

    expect(isError(thrown)).toBe(true)
    expect(thrown).toMatchObject({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Ocorreu um erro interno inesperado.',
    })
    expect(String(thrown)).not.toContain('infraestrutura')
  })
})
