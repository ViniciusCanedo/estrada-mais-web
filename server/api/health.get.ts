import { defineEventHandler, getValidatedQuery } from 'h3'
import { competenceQuerySchema } from '#shared/schemas/common.schema'
import type { HealthStatusPayload } from '#shared/schemas/health.schema'
import { healthService } from '../services/health.service'
import { handleServiceError } from '../utils/domain-error'

export default defineEventHandler(async (event): Promise<HealthStatusPayload> => {
  try {
    const query = await getValidatedQuery(event, competenceQuerySchema.parse)
    return healthService.getHealthStatus(undefined, query.month)
  } catch (error: unknown) {
    return handleServiceError(error)
  }
})
