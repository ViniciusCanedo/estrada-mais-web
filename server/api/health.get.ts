import type { HealthStatusPayload } from '#shared/utils/health-schema'
import { getHealthStatus } from '../services/health.service'

export default defineEventHandler((): HealthStatusPayload => {
  return getHealthStatus()
})
