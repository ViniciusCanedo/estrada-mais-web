import { z } from 'zod'

/**
 * Contrato de resposta do endpoint /api/health incluindo conectividade do SQLite e contadores opcionais.
 */
export const healthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  database: z.enum(['connected', 'disconnected']),
  timestamp: z.string(),
  navigationCounts: z
    .object({
      tripsCount: z.number().int().nonnegative(),
      expensesCount: z.number().int().nonnegative(),
    })
    .optional(),
})

export type HealthStatusPayload = z.infer<typeof healthResponseSchema>
