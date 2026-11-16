import { defineEventHandler, getValidatedQuery } from 'h3'
import { tripFilterQuerySchema, type TripListResponse } from '#shared/schemas/trip.schema'
import { tripService } from '../../services/trip.service'
import { withAuthenticatedDriver } from '../../utils/session'

export default defineEventHandler((event): Promise<TripListResponse> =>
  withAuthenticatedDriver(event, async (driverId) => {
    const query = await getValidatedQuery(event, tripFilterQuerySchema.parse)
    return tripService.listTrips(driverId, query)
  }),
)
