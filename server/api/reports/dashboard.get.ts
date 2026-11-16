import { defineEventHandler, getValidatedQuery } from 'h3'
import { dashboardQuerySchema, type DashboardApiResponse } from '#shared/schemas/report.schema'
import { reportService } from '../../services/report.service'
import { withAuthenticatedDriver } from '../../utils/session'

export default defineEventHandler((event): Promise<DashboardApiResponse> =>
  withAuthenticatedDriver(event, async (driverId) => {
    const query = await getValidatedQuery(event, dashboardQuerySchema.parse)
    return {
      data: reportService.getDashboardData(driverId, query.month),
    }
  }),
)
