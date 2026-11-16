import { defineEventHandler, getValidatedRouterParams } from 'h3'
import { tripIdParamsSchema } from '#shared/schemas/trip.schema'
import type { ApiSuccessResponse } from '#shared/types/domain'
import { tripService } from '../../services/trip.service'
import { withAuthenticatedDriver } from '../../utils/session'

export default defineEventHandler((event): Promise<ApiSuccessResponse> =>
  withAuthenticatedDriver(event, async (driverId) => {
    const params = await getValidatedRouterParams(event, tripIdParamsSchema.parse)
    tripService.deleteTrip(driverId, params.id)
    return { success: true }
  }),
)
