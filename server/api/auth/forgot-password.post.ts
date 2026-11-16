import { defineEventHandler, readValidatedBody, type H3Event } from 'h3'
import { forgotPasswordSchema, type AuthMessageResponse } from '#shared/schemas/auth.schema'
import { authService, RESET_REQUEST_NEUTRAL_MESSAGE } from '../../services/auth.service'
import { handleServiceError } from '../../utils/domain-error'
import { getClientIp } from '../../utils/rate-limiter'

function resolveAppBaseUrl(event: H3Event): string {
  try {
    const appUrl = useRuntimeConfig(event).public?.appUrl
    if (typeof appUrl === 'string' && appUrl.trim().length > 0) {
      return appUrl.trim()
    }
  } catch {
    // Fallback para testes unitários fora do contexto completo Nitro.
  }

  return 'http://localhost:3000'
}

export default defineEventHandler(async (event): Promise<AuthMessageResponse> => {
  try {
    const body = await readValidatedBody(event, forgotPasswordSchema.parse)
    const clientIp = getClientIp(event)
    const appBaseUrl = resolveAppBaseUrl(event)
    await authService.requestPasswordReset(body, clientIp, appBaseUrl)
    return {
      success: true,
      message: RESET_REQUEST_NEUTRAL_MESSAGE,
    }
  } catch (error: unknown) {
    return handleServiceError(error)
  }
})
