import { z } from 'zod'

const normalizedEmailSchema = z
  .string({ error: 'Informe um endereço de e-mail válido.' })
  .trim()
  .toLowerCase()
  .pipe(z.email('Informe um endereço de e-mail válido.'))

/**
 * Schema compartilhado de validação de login por e-mail e senha.
 */
export const loginSchema = z.object({
  email: normalizedEmailSchema,
  password: z
    .string({ error: 'A senha é obrigatória.' })
    .min(8, 'A senha deve ter no mínimo 8 caracteres.')
    .max(128, 'A senha deve ter no máximo 128 caracteres.'),
})

/**
 * Schema compartilhado para solicitação de link de recuperação de senha.
 */
export const forgotPasswordSchema = z.object({
  email: normalizedEmailSchema,
})

/**
 * Schema compartilhado para redefinição de senha via Magic Link de uso único.
 */
export const resetPasswordSchema = z
  .object({
    token: z
      .string({ error: 'O token de recuperação é obrigatório.' })
      .trim()
      .min(32, 'Token de recuperação inválido ou malformado.'),
    password: z
      .string({ error: 'A nova senha é obrigatória.' })
      .min(8, 'A nova senha deve ter no mínimo 8 caracteres.')
      .max(128, 'A nova senha deve ter no máximo 128 caracteres.'),
    confirmPassword: z.string({ error: 'A confirmação de senha é obrigatória.' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas informadas não coincidem.',
  })

/**
 * Contrato de perfil resumido do motorista autenticado em sessão.
 */
export const sessionUserSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  email: z.email(),
  initials: z.string(),
  vehicleSummary: z.string(),
})

/**
 * Schema vazio para validação formal da query de encerramento de sessão.
 */
export const logoutQuerySchema = z.object({})

export type LoginInput = z.infer<typeof loginSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type SessionUser = z.infer<typeof sessionUserSchema>

export interface AuthMessageResponse {
  success: true
  message: string
}
