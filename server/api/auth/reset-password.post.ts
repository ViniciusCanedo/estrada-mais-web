import { defineEventHandler, readValidatedBody } from 'h3'
import { resetPasswordSchema, type AuthMessageResponse } from '#shared/schemas/auth.schema'
import { authService, RESET_PASSWORD_SUCCESS_MESSAGE } from '../../services/auth.service'
import { handleServiceError } from '../../utils/domain-error'

export default defineEventHandler(async (event): Promise<AuthMessageResponse> => {
  try {
    const body = await readValidatedBody(event, resetPasswordSchema.parse)
    await authService.resetPassword(body)
    return {
      success: true,
      message: RESET_PASSWORD_SUCCESS_MESSAGE,
    }
  } catch (error: unknown) {
    return handleServiceError(error)
  }
})
