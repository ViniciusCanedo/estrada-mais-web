import { defineEventHandler, readValidatedBody } from 'h3'
import {
  updateTelemetryTargetsSchema,
  type DriverSettingsResponse,
} from '#shared/schemas/settings.schema'
import type { ApiItemResponse } from '#shared/types/domain'
import { settingsService } from '../../services/settings.service'
import { withAuthenticatedDriver } from '../../utils/session'

export default defineEventHandler((event): Promise<ApiItemResponse<DriverSettingsResponse>> =>
  withAuthenticatedDriver(event, async (driverId) => {
    const body = await readValidatedBody(event, updateTelemetryTargetsSchema.parse)
    return { data: settingsService.updateTelemetryTargets(driverId, body) }
  }),
)
