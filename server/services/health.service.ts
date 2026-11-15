import { healthResponseSchema, type HealthStatusPayload } from '../../shared/utils/health-schema'

export function getHealthStatus(): HealthStatusPayload {
  return healthResponseSchema.parse({
    status: 'ok',
    timestamp: new Date().toISOString(),
  })
}
