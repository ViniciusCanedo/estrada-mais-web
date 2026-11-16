import { z } from 'zod'

const normalizedEmailSchema = z
  .string({ error: 'Informe um endereço de e-mail válido.' })
  .trim()
  .toLowerCase()
  .pipe(z.email('Informe um endereço de e-mail válido.'))

export const TARGET_CONSUMPTION_MIN_KML = 1.8
export const TARGET_CONSUMPTION_MAX_KML = 3.2
export const TARGET_CONSUMPTION_STEP_KML = 0.05

export const MAX_COST_PER_KM_MIN_REAIS = 3.5
export const MAX_COST_PER_KM_MAX_REAIS = 7.0
export const MAX_COST_PER_KM_STEP_REAIS = 0.1

/**
 * Schema compartilhado para atualização do cadastro do motorista TAC e conjunto veicular.
 */
export const updateDriverProfileSchema = z.object({
  name: z
    .string({ error: 'O nome completo é obrigatório.' })
    .trim()
    .min(3, 'O nome deve ter pelo menos 3 caracteres.')
    .max(120, 'O nome deve ter no máximo 120 caracteres.'),
  rntrc: z
    .string({ error: 'O registro RNTRC é obrigatório.' })
    .trim()
    .min(5, 'Informe um registro RNTRC válido (ex.: 58.912.440-TAC).')
    .max(30, 'O registro RNTRC deve ter no máximo 30 caracteres.'),
  vehicleModel: z
    .string({ error: 'O modelo do cavalo mecânico é obrigatório.' })
    .trim()
    .min(3, 'Informe a marca e modelo do cavalo mecânico.')
    .max(120, 'O modelo deve ter no máximo 120 caracteres.'),
  vehiclePlates: z
    .string({ error: 'As placas do veículo são obrigatórias.' })
    .trim()
    .min(7, 'Informe ao menos a placa do cavalo mecânico (ex.: BRA-2E19).')
    .max(40, 'O campo de placas deve ter no máximo 40 caracteres.'),
})

/**
 * Schema compartilhado para alteração autenticada de e-mail e senha opcional do motorista.
 */
export const updateCredentialsSchema = z
  .object({
    email: normalizedEmailSchema,
    currentPassword: z.string().optional(),
    newPassword: z
      .string()
      .min(8, 'A nova senha deve ter no mínimo 8 caracteres.')
      .max(128, 'A nova senha deve ter no máximo 128 caracteres.')
      .optional()
      .or(z.literal('')),
  })
  .refine(
    (data) => {
      const hasNewPassword = typeof data.newPassword === 'string' && data.newPassword.length > 0
      if (!hasNewPassword) {
        return true
      }
      return typeof data.currentPassword === 'string' && data.currentPassword.trim().length > 0
    },
    {
      path: ['currentPassword'],
      message: 'Informe a senha atual para definir uma nova senha.',
    },
  )

/**
 * Schema compartilhado para atualização das metas operacionais de telemetria dentro dos limites normativos.
 */
export const updateTelemetryTargetsSchema = z.object({
  targetConsumptionKmL: z
    .number({ error: 'A meta de consumo é obrigatória.' })
    .min(TARGET_CONSUMPTION_MIN_KML, 'A meta mínima de consumo é 1,80 km/L.')
    .max(TARGET_CONSUMPTION_MAX_KML, 'A meta máxima de consumo é 3,20 km/L.'),
  maxCostPerKmReais: z
    .number({ error: 'O teto de custo operacional é obrigatório.' })
    .min(MAX_COST_PER_KM_MIN_REAIS, 'O teto mínimo é R$ 3,50 / km.')
    .max(MAX_COST_PER_KM_MAX_REAIS, 'O teto máximo é R$ 7,00 / km.'),
})

/**
 * Contrato de resposta da API de configurações e metas do motorista autenticado.
 */
export const driverSettingsResponseSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  email: z.email(),
  rntrc: z.string(),
  vehicleModel: z.string(),
  vehiclePlates: z.string(),
  targetConsumptionKmL: z.number(),
  maxCostPerKmReais: z.number(),
  updatedAt: z.string(),
})

export type UpdateDriverProfileInput = z.infer<typeof updateDriverProfileSchema>
export type UpdateCredentialsInput = z.infer<typeof updateCredentialsSchema>
export type UpdateTelemetryTargetsInput = z.infer<typeof updateTelemetryTargetsSchema>
export type DriverSettingsResponse = z.infer<typeof driverSettingsResponseSchema>
