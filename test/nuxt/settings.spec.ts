import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { readBody } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { h } from 'vue'
import type { DriverSettingsResponse } from '#shared/schemas/settings.schema'
import { useAuthSession } from '~/composables/useAuthSession'
import DefaultLayout from '~/layouts/default.vue'
import SettingsPage from '~/pages/settings.vue'
import { DEFAULT_DRIVER_EMAIL, DEFAULT_DRIVER_SECRET } from '../../server/database/seed-data'

const NEW_CREDENTIAL = ['NovaSenhaNuxt', '2026'].join('@')
const WRONG_CREDENTIAL = ['SenhaErradaNuxt', '2026'].join('@')

const INITIAL_SETTINGS: DriverSettingsResponse = {
  id: 1,
  name: 'Valdir Silveira',
  email: DEFAULT_DRIVER_EMAIL,
  rntrc: '58.912.440-TAC',
  vehicleModel: 'Scania R450 Highline 6x2 (2021)',
  vehiclePlates: 'BRA-2E19 / CUR-4901',
  targetConsumptionKmL: 2.35,
  maxCostPerKmReais: 5.1,
  updatedAt: '2026-09-16T12:00:00.000Z',
}

let currentSettings: DriverSettingsResponse = { ...INITIAL_SETTINGS }
let settingsGetMode: 'ok' | 'error' | 'empty' | 'delayed' = 'ok'
let profileErrorMode = false
let credentialsErrorCode: 0 | 401 | 409 = 0
let targetsErrorMode = false
let resolveDelayedGet: (() => void) | null = null

registerEndpoint('/api/auth/me', () => ({
  data: {
    id: 1,
    name: currentSettings.name,
    email: currentSettings.email,
    initials: 'VS',
    vehicleSummary: 'Scania R450 • 6x2',
  },
}))

registerEndpoint('/api/auth/logout', {
  method: 'POST',
  handler: () => ({ success: true }),
})

registerEndpoint('/api/health', () => ({
  status: 'ok',
  database: 'connected',
  timestamp: '2026-09-16T12:00:00.000Z',
  navigationCounts: { tripsCount: 5, expensesCount: 10 },
}))

registerEndpoint('/api/settings', async () => {
  if (settingsGetMode === 'delayed') {
    await new Promise<void>((resolve) => {
      resolveDelayedGet = resolve
    })
  }
  if (settingsGetMode === 'error') {
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Erro ao carregar configurações.',
    })
  }
  if (settingsGetMode === 'empty') {
    return { data: null }
  }
  return { data: currentSettings }
})

registerEndpoint('/api/settings/profile', {
  method: 'PUT',
  handler: async (event) => {
    if (profileErrorMode) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Falha ao atualizar perfil.',
        data: { message: 'Falha ao atualizar perfil.' },
      })
    }
    const body = await readBody<Partial<DriverSettingsResponse>>(event)
    currentSettings = {
      ...currentSettings,
      name: body.name ?? currentSettings.name,
      rntrc: body.rntrc ?? currentSettings.rntrc,
      vehicleModel: body.vehicleModel ?? currentSettings.vehicleModel,
      vehiclePlates: body.vehiclePlates ?? currentSettings.vehiclePlates,
      updatedAt: '2026-09-17T10:00:00.000Z',
    }
    return { data: currentSettings }
  },
})

registerEndpoint('/api/settings/credentials', {
  method: 'PUT',
  handler: async (event) => {
    if (credentialsErrorCode === 401) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized',
        message: 'A senha atual informada está incorreta.',
        data: { message: 'A senha atual informada está incorreta.' },
      })
    }
    if (credentialsErrorCode === 409) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Conflict',
        message: 'Este e-mail já está em uso por outro motorista.',
        data: { message: 'Este e-mail já está em uso por outro motorista.' },
      })
    }
    const body = await readBody<{ email?: string }>(event)
    currentSettings = {
      ...currentSettings,
      email: body.email?.trim().toLowerCase() ?? currentSettings.email,
      updatedAt: '2026-09-17T11:00:00.000Z',
    }
    return { data: currentSettings }
  },
})

registerEndpoint('/api/settings/targets', {
  method: 'PUT',
  handler: async (event) => {
    if (targetsErrorMode) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Metas fora do limite permitido.',
        data: { message: 'Metas fora do limite permitido.' },
      })
    }
    const body = await readBody<{ targetConsumptionKmL?: number; maxCostPerKmReais?: number }>(
      event,
    )
    currentSettings = {
      ...currentSettings,
      targetConsumptionKmL: body.targetConsumptionKmL ?? currentSettings.targetConsumptionKmL,
      maxCostPerKmReais: body.maxCostPerKmReais ?? currentSettings.maxCostPerKmReais,
      updatedAt: '2026-09-17T12:00:00.000Z',
    }
    return { data: currentSettings }
  },
})

describe('Página /settings e Componentes de Configurações (Nuxt Runtime)', () => {
  beforeEach(() => {
    currentSettings = { ...INITIAL_SETTINGS }
    settingsGetMode = 'ok'
    profileErrorMode = false
    credentialsErrorCode = 0
    targetsErrorMode = false
    resolveDelayedGet = null
    clearNuxtData('driver-settings')

    const auth = useAuthSession()
    auth.user.value = {
      id: 1,
      name: INITIAL_SETTINGS.name,
      email: INITIAL_SETTINGS.email,
      initials: 'VS',
      vehicleSummary: 'Scania R450 • 6x2',
    }
    auth.hasLoadedSession.value = true
  })

  it('deve renderizar estados de carregamento, erro com tentativa e estado vazio em settings.vue', async () => {
    settingsGetMode = 'error'
    const errorWrapper = await mountSuspended(SettingsPage)
    await vi.waitFor(() => {
      expect(errorWrapper.find('[data-testid="settings-error-state"]').exists()).toBe(true)
    })

    settingsGetMode = 'ok'
    await errorWrapper.find('[data-testid="settings-retry-btn"]').trigger('click')
    await vi.waitFor(() => {
      expect(errorWrapper.find('[data-testid="settings-profile-card"]').exists()).toBe(true)
    })

    clearNuxtData('driver-settings')
    settingsGetMode = 'empty'
    const emptyWrapper = await mountSuspended(SettingsPage)
    await vi.waitFor(() => {
      expect(emptyWrapper.find('[data-testid="settings-empty-state"]').exists()).toBe(true)
    })

    clearNuxtData('driver-settings')
    settingsGetMode = 'delayed'
    const loadingWrapper = await mountSuspended(SettingsPage)
    expect(loadingWrapper.find('[data-testid="settings-loading-state"]').exists()).toBe(true)
    resolveDelayedGet?.()
    await flushPromises()
  })

  it('deve preencher os cards, exibir nota biométrica e sincronizar a Sidebar após salvar perfil', async () => {
    const wrapper = await mountSuspended(DefaultLayout, {
      slots: {
        default: () => h(SettingsPage),
      },
    })

    await vi.waitFor(() => {
      expect(wrapper.find('[data-testid="settings-profile-card"]').exists()).toBe(true)
    })

    expect(
      (wrapper.find('[data-testid="settings-name-input"]').element as HTMLInputElement).value,
    ).toBe('Valdir Silveira')
    expect(wrapper.find('[data-testid="settings-biometric-note"]').text()).toContain(
      'Desbloqueio biométrico (FaceID/Impressão digital) é exclusivo da versão mobile',
    )

    await wrapper.find('[data-testid="settings-name-input"]').setValue('AB')
    await wrapper.find('[data-testid="settings-profile-card"] form').trigger('submit')
    await vi.waitFor(() => {
      expect(wrapper.find('[data-testid="settings-profile-card"]').text()).toContain(
        'O nome deve ter pelo menos 3 caracteres.',
      )
      expect(
        (wrapper.find('[data-testid="settings-name-input"]').element as HTMLInputElement).disabled,
      ).toBe(false)
    })

    profileErrorMode = true
    await wrapper.find('[data-testid="settings-name-input"]').setValue('Roberto Carlos')
    await wrapper
      .find('[data-testid="settings-vehicle-model-input"]')
      .setValue('Volvo FH540 Globetrotter 6x4 (2024)')
    await wrapper.find('[data-testid="settings-profile-card"] form').trigger('submit')
    await vi.waitFor(() => {
      expect(wrapper.find('[data-testid="settings-profile-error"]').text()).toContain(
        'Falha ao atualizar perfil.',
      )
    })

    profileErrorMode = false
    await wrapper.find('[data-testid="settings-profile-card"] form').trigger('submit')
    await vi.waitFor(() => {
      expect(wrapper.find('[data-testid="sidebar-driver-name"]').text()).toBe('Roberto Carlos')
      expect(wrapper.find('[data-testid="sidebar-driver-initials"]').text()).toBe('RC')
      expect(wrapper.find('[data-testid="sidebar-driver-vehicle"]').text()).toBe(
        'Volvo FH540 • 6x4',
      )
    })
  })

  it('deve validar e atualizar credenciais de acesso e metas operacionais via sliders', async () => {
    const wrapper = await mountSuspended(SettingsPage)
    await vi.waitFor(() => {
      expect(wrapper.find('[data-testid="settings-credentials-card"]').exists()).toBe(true)
    })

    await wrapper.find('[data-testid="settings-new-password-input"]').setValue(NEW_CREDENTIAL)
    await wrapper.find('[data-testid="settings-credentials-card"] form').trigger('submit')
    await vi.waitFor(() => {
      expect(wrapper.find('[data-testid="settings-credentials-card"]').text()).toContain(
        'Informe a senha atual para definir uma nova senha.',
      )
      expect(
        (
          wrapper.find('[data-testid="settings-current-password-input"]')
            .element as HTMLInputElement
        ).disabled,
      ).toBe(false)
    })

    credentialsErrorCode = 401
    await wrapper.find('[data-testid="settings-current-password-input"]').setValue(WRONG_CREDENTIAL)
    await wrapper.find('[data-testid="settings-credentials-card"] form').trigger('submit')
    await vi.waitFor(() => {
      expect(wrapper.find('[data-testid="settings-credentials-error"]').text()).toContain(
        'A senha atual informada está incorreta.',
      )
    })

    credentialsErrorCode = 409
    await wrapper
      .find('[data-testid="settings-current-password-input"]')
      .setValue(DEFAULT_DRIVER_SECRET)
    await wrapper.find('[data-testid="settings-email-input"]').setValue('outro@estrada.com.br')
    await wrapper.find('[data-testid="settings-credentials-card"] form').trigger('submit')
    await vi.waitFor(() => {
      expect(wrapper.find('[data-testid="settings-credentials-error"]').text()).toContain(
        'Este e-mail já está em uso por outro motorista.',
      )
    })

    credentialsErrorCode = 0
    await wrapper
      .find('[data-testid="settings-email-input"]')
      .setValue('valdir.novo@estrada.com.br')
    await wrapper.find('[data-testid="settings-credentials-card"] form').trigger('submit')
    await vi.waitFor(() => {
      expect(useAuthSession().user.value?.email).toBe('valdir.novo@estrada.com.br')
      expect(
        (wrapper.find('[data-testid="settings-new-password-input"]').element as HTMLInputElement)
          .value,
      ).toBe('')
    })

    await wrapper.find('[data-testid="settings-target-consumption-slider"]').setValue('2.75')
    await wrapper.find('[data-testid="settings-max-cost-slider"]').setValue('6.2')
    expect(wrapper.find('[data-testid="settings-target-consumption-value"]').text()).toBe(
      '2,75 km/L',
    )
    expect(wrapper.find('[data-testid="settings-max-cost-value"]').text()).toBe('R$ 6,20 / km')

    targetsErrorMode = true
    await wrapper.find('[data-testid="settings-targets-card"] form').trigger('submit')
    await vi.waitFor(() => {
      expect(wrapper.find('[data-testid="settings-targets-error"]').text()).toContain(
        'Metas fora do limite permitido.',
      )
    })

    targetsErrorMode = false
    await wrapper.find('[data-testid="settings-targets-card"] form').trigger('submit')
    await vi.waitFor(() => {
      expect(currentSettings.targetConsumptionKmL).toBeCloseTo(2.75, 10)
      expect(currentSettings.maxCostPerKmReais).toBeCloseTo(6.2, 10)
    })
  })
})
