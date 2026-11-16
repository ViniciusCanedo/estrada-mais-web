import { defineEventHandler, getValidatedRouterParams, readValidatedBody } from 'h3'
import {
  expenseIdParamsSchema,
  expensePayloadSchema,
  type ExpenseDto,
} from '#shared/schemas/expense.schema'
import type { ApiItemResponse } from '#shared/types/domain'
import { expenseService } from '../../services/expense.service'
import { withAuthenticatedDriver } from '../../utils/session'

export default defineEventHandler((event): Promise<ApiItemResponse<ExpenseDto>> =>
  withAuthenticatedDriver(event, async (driverId) => {
    const params = await getValidatedRouterParams(event, expenseIdParamsSchema.parse)
    const body = await readValidatedBody(event, expensePayloadSchema.parse)
    return { data: expenseService.updateExpense(driverId, params.id, body) }
  }),
)
