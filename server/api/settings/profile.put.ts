import { defineEventHandler, readValidatedBody } from 'h3'
import {
  updateDriverProfileSchema,
  type DriverSettingsResponse,
} from '#shared/schemas/settings.schema'
import type { ApiItemResponse } from '#shared/types/domain'
import { settingsService } from '../../services/settings.service'
import { withAuthenticatedDriver } from '../../utils/session'

export default defineEventHandler((event): Promise<ApiItemResponse<DriverSettingsResponse>> =>
  withAuthenticatedDriver(event, async (driverId) => {
    const body = await readValidatedBody(event, updateDriverProfileSchema.parse)
    return { data: settingsService.updateProfile(driverId, body) }
  }),
)
