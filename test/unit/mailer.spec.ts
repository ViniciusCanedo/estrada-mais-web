import nodemailer from 'nodemailer'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { sendPasswordResetEmail } from '../../server/utils/mailer'

describe('Utilitário de E-mail SMTP (server/utils/mailer)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('deve operar em modo simulado seguro quando SMTP host estiver vazio sem vazar e-mail ou token', async () => {
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true)
    const transportSpy = vi.spyOn(nodemailer, 'createTransport')

    await sendPasswordResetEmail(
      'motorista@estrada.com.br',
      'Valdir Silveira',
      'https://app.estrada.com.br/reset-password?token=segredo-unico',
      {
        host: '',
        port: 587,
        user: '',
        pass: '',
        from: 'Estrada+ <no-reply@estradamais.com.br>',
      },
    )

    expect(transportSpy).not.toHaveBeenCalled()
    expect(stdoutSpy).toHaveBeenCalledTimes(1)
    const loggedMessage = String(stdoutSpy.mock.calls[0]?.[0] ?? '')
    expect(loggedMessage).not.toContain('motorista@estrada.com.br')
    expect(loggedMessage).not.toContain('segredo-unico')
  })

  it('deve enviar e-mail autenticado via nodemailer quando SMTP estiver configurado na porta 587', async () => {
    const sendMailMock = vi.fn().mockResolvedValue({ messageId: 'msg-1' })
    const createTransportSpy = vi
      .spyOn(nodemailer, 'createTransport')
      .mockReturnValue({ sendMail: sendMailMock } as unknown as ReturnType<
        typeof nodemailer.createTransport
      >)

    await sendPasswordResetEmail(
      'valdir@estrada.com.br',
      'Valdir <TAC>',
      'http://localhost:3000/reset-password?token=abc123',
      {
        host: 'smtp.exemplo.com',
        port: 587,
        user: 'usuario-smtp',
        pass: 'chave-smtp',
        from: 'Estrada+ <no-reply@estradamais.com.br>',
      },
    )

    expect(createTransportSpy).toHaveBeenCalledWith({
      host: 'smtp.exemplo.com',
      port: 587,
      secure: false,
      auth: {
        user: 'usuario-smtp',
        pass: 'chave-smtp',
      },
    })
    expect(sendMailMock).toHaveBeenCalledTimes(1)
    const mailArgs = sendMailMock.mock.calls[0]?.[0] as {
      to: string
      from: string
      html: string
      text: string
    }
    expect(mailArgs.to).toBe('valdir@estrada.com.br')
    expect(mailArgs.from).toBe('Estrada+ <no-reply@estradamais.com.br>')
    expect(mailArgs.html).toContain('Valdir &lt;TAC&gt;')
    expect(mailArgs.text).toContain('token=abc123')
  })

  it('deve ler configurações SMTP do useRuntimeConfig com TLS direto na porta 465 sem auth', async () => {
    const sendMailMock = vi.fn().mockResolvedValue({ messageId: 'msg-2' })
    const createTransportSpy = vi
      .spyOn(nodemailer, 'createTransport')
      .mockReturnValue({ sendMail: sendMailMock } as unknown as ReturnType<
        typeof nodemailer.createTransport
      >)

    vi.stubGlobal('useRuntimeConfig', () => ({
      smtp: {
        host: 'smtp.tls.exemplo.com',
        port: 465,
        user: '',
        pass: '',
        from: 'Estrada+ <no-reply@estradamais.com.br>',
      },
    }))

    await sendPasswordResetEmail(
      'valdir@estrada.com.br',
      'Valdir Silveira',
      'http://localhost:3000/reset-password?token=xyz',
    )

    expect(createTransportSpy).toHaveBeenCalledWith({
      host: 'smtp.tls.exemplo.com',
      port: 465,
      secure: true,
    })
    expect(sendMailMock).toHaveBeenCalledTimes(1)
  })
})
