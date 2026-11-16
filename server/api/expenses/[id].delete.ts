import { defineEventHandler, getValidatedRouterParams } from 'h3'
import { expenseIdParamsSchema } from '#shared/schemas/expense.schema'
import type { ApiSuccessResponse } from '#shared/types/domain'
import { expenseService } from '../../services/expense.service'
import { withAuthenticatedDriver } from '../../utils/session'

export default defineEventHandler((event): Promise<ApiSuccessResponse> =>
  withAuthenticatedDriver(event, async (driverId) => {
    const params = await getValidatedRouterParams(event, expenseIdParamsSchema.parse)
    expenseService.deleteExpense(driverId, params.id)
    return { success: true }
  }),
)
