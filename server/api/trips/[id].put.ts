import { defineEventHandler, getValidatedRouterParams, readValidatedBody } from 'h3'
import { tripIdParamsSchema, tripPayloadSchema, type TripDto } from '#shared/schemas/trip.schema'
import type { ApiItemResponse } from '#shared/types/domain'
import { tripService } from '../../services/trip.service'
import { withAuthenticatedDriver } from '../../utils/session'

export default defineEventHandler((event): Promise<ApiItemResponse<TripDto>> =>
  withAuthenticatedDriver(event, async (driverId) => {
    const params = await getValidatedRouterParams(event, tripIdParamsSchema.parse)
    const body = await readValidatedBody(event, tripPayloadSchema.parse)
    return { data: tripService.updateTrip(driverId, params.id, body) }
  }),
)
