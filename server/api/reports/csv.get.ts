import { defineEventHandler, getValidatedQuery, setHeader } from 'h3'
import { dashboardQuerySchema } from '#shared/schemas/report.schema'
import { reportService } from '../../services/report.service'
import { withAuthenticatedDriver } from '../../utils/session'

export default defineEventHandler((event): Promise<string> =>
  withAuthenticatedDriver(event, async (driverId) => {
    const query = await getValidatedQuery(event, dashboardQuerySchema.parse)
    const csv = reportService.generateMonthlyCsv(driverId, query.month)

    setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
    setHeader(event, 'Content-Disposition', `attachment; filename="${csv.filename}"`)
    return csv.content
  }),
)
