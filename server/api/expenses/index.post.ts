import { defineEventHandler, readValidatedBody, setResponseStatus } from 'h3'
import { expensePayloadSchema, type ExpenseDto } from '#shared/schemas/expense.schema'
import type { ApiItemResponse } from '#shared/types/domain'
import { expenseService } from '../../services/expense.service'
import { withAuthenticatedDriver } from '../../utils/session'

export default defineEventHandler((event): Promise<ApiItemResponse<ExpenseDto>> =>
  withAuthenticatedDriver(event, async (driverId) => {
    const body = await readValidatedBody(event, expensePayloadSchema.parse)
    const created = expenseService.createExpense(driverId, body)
    setResponseStatus(event, 201)
    return { data: created }
  }),
)
