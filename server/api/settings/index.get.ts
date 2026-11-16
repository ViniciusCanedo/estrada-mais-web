import { defineEventHandler } from 'h3'
import type { DriverSettingsResponse } from '#shared/schemas/settings.schema'
import type { ApiItemResponse } from '#shared/types/domain'
import { settingsService } from '../../services/settings.service'
import { withAuthenticatedDriver } from '../../utils/session'

export default defineEventHandler((event): Promise<ApiItemResponse<DriverSettingsResponse>> =>
  withAuthenticatedDriver(event, (driverId) => ({
    data: settingsService.getSettings(driverId),
  })),
)
