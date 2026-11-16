import { defineEventHandler, getValidatedQuery } from 'h3'
import { expenseFilterQuerySchema, type ExpenseListResponse } from '#shared/schemas/expense.schema'
import { expenseService } from '../../services/expense.service'
import { withAuthenticatedDriver } from '../../utils/session'

export default defineEventHandler((event): Promise<ExpenseListResponse> =>
  withAuthenticatedDriver(event, async (driverId) => {
    const query = await getValidatedQuery(event, expenseFilterQuerySchema.parse)
    return expenseService.listExpenses(driverId, query)
  }),
)
