import { defineEventHandler, readValidatedBody } from 'h3'
import { loginSchema, type SessionUser } from '#shared/schemas/auth.schema'
import type { ApiItemResponse } from '#shared/types/domain'
import { authService } from '../../services/auth.service'
import { handleServiceError } from '../../utils/domain-error'
import { getClientIp } from '../../utils/rate-limiter'
import { setDriverSession } from '../../utils/session'

export default defineEventHandler(async (event): Promise<ApiItemResponse<SessionUser>> => {
  try {
    const body = await readValidatedBody(event, loginSchema.parse)
    const clientIp = getClientIp(event)
    const user = await authService.authenticate(body, clientIp)
    await setDriverSession(event, user.id)
    return { data: user }
  } catch (error: unknown) {
    return handleServiceError(error)
  }
})
