import type { NuxtError } from '#app'
import { computed, getCurrentInstance, onServerPrefetch, type ComputedRef, type Ref } from 'vue'
import type { SessionUser } from '#shared/schemas/auth.schema'
import type {
  DriverSettingsResponse,
  UpdateCredentialsInput,
  UpdateDriverProfileInput,
  UpdateTelemetryTargetsInput,
} from '#shared/schemas/settings.schema'
import type { ApiItemResponse } from '#shared/types/domain'
import { computeInitials, formatDriverSummary } from '#shared/utils/driver-profile'
import { useApiFetch } from './useApiFetch'
import { useAuthSession } from './useAuthSession'

const DRIVER_SETTINGS_CACHE_KEY = 'driver-settings'

export interface DriverSettingsState {
  settings: ComputedRef<DriverSettingsResponse | null>
  pending: ComputedRef<boolean>
  error: Ref<NuxtError<unknown> | undefined>
  refresh: () => Promise<void>
  saveProfile: (payload: UpdateDriverProfileInput) => Promise<DriverSettingsResponse>
  saveCredentials: (payload: UpdateCredentialsInput) => Promise<DriverSettingsResponse>
  saveTargets: (payload: UpdateTelemetryTargetsInput) => Promise<DriverSettingsResponse>
}

function toSessionUser(settings: DriverSettingsResponse): SessionUser {
  return {
    id: settings.id,
    name: settings.name,
    email: settings.email,
    initials: computeInitials(settings.name),
    vehicleSummary: formatDriverSummary(settings.vehicleModel),
  }
}

/**
 * Gerencia leitura SSR e mutações de cadastro, credenciais e metas do motorista com sincronização da sessão.
 */
export function useDriverSettings(): DriverSettingsState {
  const { setSessionUser } = useAuthSession()
  const settingsAsyncData = useApiFetch<ApiItemResponse<DriverSettingsResponse>>('/settings', {
    key: DRIVER_SETTINGS_CACHE_KEY,
  })

  if (getCurrentInstance()) {
    onServerPrefetch(async () => {
      await settingsAsyncData
    })
  }

  const settings = computed(() => settingsAsyncData.data.value?.data ?? null)
  const pending = computed(() => settingsAsyncData.status.value === 'pending')

  async function persistSettings<TPayload extends Record<string, unknown>>(
    endpoint: string,
    payload: TPayload,
    syncSession: boolean,
  ): Promise<DriverSettingsResponse> {
    const response = await $fetch<ApiItemResponse<DriverSettingsResponse>>(endpoint, {
      method: 'PUT',
      body: payload,
    })

    settingsAsyncData.data.value = response
    if (syncSession) {
      setSessionUser(toSessionUser(response.data))
    }
    return response.data
  }

  function saveProfile(payload: UpdateDriverProfileInput): Promise<DriverSettingsResponse> {
    return persistSettings('/api/settings/profile', payload, true)
  }

  function saveCredentials(payload: UpdateCredentialsInput): Promise<DriverSettingsResponse> {
    return persistSettings('/api/settings/credentials', payload, true)
  }

  function saveTargets(payload: UpdateTelemetryTargetsInput): Promise<DriverSettingsResponse> {
    return persistSettings('/api/settings/targets', payload, false)
  }

  async function refresh(): Promise<void> {
    await settingsAsyncData.refresh()
  }

  return {
    settings,
    pending,
    error: settingsAsyncData.error,
    refresh,
    saveProfile,
    saveCredentials,
    saveTargets,
  }
}
