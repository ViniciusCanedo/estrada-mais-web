import { defineEventHandler, getValidatedQuery } from 'h3'
import { logoutQuerySchema } from '#shared/schemas/auth.schema'
import type { ApiSuccessResponse } from '#shared/types/domain'
import { handleServiceError } from '../../utils/domain-error'
import { clearDriverSession } from '../../utils/session'

export default defineEventHandler(async (event): Promise<ApiSuccessResponse> => {
  try {
    await getValidatedQuery(event, logoutQuerySchema.parse)
    await clearDriverSession(event)
    return { success: true }
  } catch (error: unknown) {
    return handleServiceError(error)
  }
})
