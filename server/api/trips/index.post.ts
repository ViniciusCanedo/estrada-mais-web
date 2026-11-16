import { defineEventHandler, readValidatedBody, setResponseStatus } from 'h3'
import { tripPayloadSchema, type TripDto } from '#shared/schemas/trip.schema'
import type { ApiItemResponse } from '#shared/types/domain'
import { tripService } from '../../services/trip.service'
import { withAuthenticatedDriver } from '../../utils/session'

export default defineEventHandler((event): Promise<ApiItemResponse<TripDto>> =>
  withAuthenticatedDriver(event, async (driverId) => {
    const body = await readValidatedBody(event, tripPayloadSchema.parse)
    const created = tripService.createTrip(driverId, body)
    setResponseStatus(event, 201)
    return { data: created }
  }),
)
