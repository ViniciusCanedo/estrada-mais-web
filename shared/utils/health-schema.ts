import { z } from 'zod'

export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  timestamp: z.string(),
})

export type HealthStatusPayload = z.infer<typeof healthResponseSchema>
