import nodemailer from 'nodemailer'

export interface SmtpConfig {
  host: string
  port: number
  user: string
  pass: string
  from: string
}

const DEFAULT_SMTP_CONFIG: SmtpConfig = {
  host: '',
  port: 587,
  user: '',
  pass: '',
  from: 'Estrada+ Telemetria <no-reply@estradamais.com.br>',
}

function resolveSmtpConfig(override?: SmtpConfig): SmtpConfig {
  if (override) {
    return override
  }

  try {
    const runtimeSmtp = useRuntimeConfig().smtp
    return {
      host: runtimeSmtp.host ?? '',
      port: Number(runtimeSmtp.port || DEFAULT_SMTP_CONFIG.port),
      user: runtimeSmtp.user ?? '',
      pass: runtimeSmtp.pass ?? '',
      from: runtimeSmtp.from || DEFAULT_SMTP_CONFIG.from,
    }
  } catch {
    return DEFAULT_SMTP_CONFIG
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

/**
 * Envia e-mail com Magic Link de redefinição de senha via SMTP ou opera em modo simulado sem host configurado.
 */
export async function sendPasswordResetEmail(
  to: string,
  driverName: string,
  resetUrl: string,
  smtpOverride?: SmtpConfig,
): Promise<void> {
  const smtp = resolveSmtpConfig(smtpOverride)

  if (!smtp.host.trim()) {
    process.stdout.write(
      '[mailer] SMTP não configurado; envio de recuperação de senha executado em modo simulado.\n',
    )
    return
  }

  const hasAuth = smtp.user.trim().length > 0 && smtp.pass.trim().length > 0
  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    ...(hasAuth ? { auth: { user: smtp.user, pass: smtp.pass } } : {}),
  })

  await transporter.sendMail({
    from: smtp.from,
    to,
    subject: 'Estrada+ | Recuperação de Senha',
    text: `Olá, ${driverName}.\n\nAcesse o link abaixo para redefinir sua senha (válido por 30 minutos):\n${resetUrl}\n\nSe você não solicitou esta alteração, ignore este e-mail.`,
    html: `<p>Olá, <strong>${escapeHtml(driverName)}</strong>.</p><p>Acesse o link abaixo para redefinir sua senha (válido por 30 minutos):</p><p><a href="${escapeHtml(resetUrl)}">Redefinir minha senha</a></p><p>Se você não solicitou esta alteração, ignore este e-mail.</p>`,
  })
}
