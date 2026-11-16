import { defineEventHandler } from 'h3'
import type { SessionUser } from '#shared/schemas/auth.schema'
import type { ApiItemResponse } from '#shared/types/domain'
import { authService } from '../../services/auth.service'
import { handleServiceError } from '../../utils/domain-error'
import { requireAuthenticatedDriverId } from '../../utils/session'

export default defineEventHandler(async (event): Promise<ApiItemResponse<SessionUser>> => {
  try {
    const driverId = await requireAuthenticatedDriverId(event)
    const user = authService.getSessionProfile(driverId)
    return { data: user }
  } catch (error: unknown) {
    return handleServiceError(error)
  }
})
