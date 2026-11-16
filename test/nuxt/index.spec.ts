import type { NuxtError } from '#app'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AppRoot from '~/app.vue'
import { useAuthSession } from '~/composables/useAuthSession'
import ErrorPage from '~/error.vue'
import DefaultLayout from '~/layouts/default.vue'
import IndexPage from '~/pages/index.vue'

let shouldFailHealth = false

const MOCK_SESSION_USER = {
  id: 1,
  name: 'Valdir Silveira',
  email: 'valdir.silveira.truck@estrada.com.br',
  initials: 'VS',
  vehicleSummary: 'Scania R450 • 6x2',
}

registerEndpoint('/api/auth/me', () => ({ data: MOCK_SESSION_USER }))
registerEndpoint('/api/auth/logout', () => ({ success: true }))

registerEndpoint('/api/health', () => {
  if (shouldFailHealth) {
    throw createError({ statusCode: 503, statusMessage: 'Service Unavailable' })
  }
  return {
    status: 'ok',
    database: 'connected',
    timestamp: '2026-09-16T12:00:00.000Z',
  }
})

describe('Página Inicial e Componentes Globais (Nuxt Runtime)', () => {
  beforeEach(() => {
    const auth = useAuthSession()
    auth.user.value = { ...MOCK_SESSION_USER }
    auth.hasLoadedSession.value = true
  })

  it('renderiza o status de saúde da plataforma e executa verificação manual via $fetch', async () => {
    shouldFailHealth = false
    const wrapper = await mountSuspended(IndexPage)

    expect(wrapper.text()).toContain('Estrada+ Telemetria')
    expect(wrapper.find('[data-testid="health-status-value"]').text()).toContain('ok')
    expect(wrapper.find('[data-testid="health-database-value"]').text()).toContain('connected')

    const manualFetchBtn = wrapper.find('[data-testid="manual-fetch-btn"]')
    expect(manualFetchBtn.exists()).toBe(true)
    await manualFetchBtn.trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="manual-health-timestamp"]').text()).toContain(
      '2026-09-16T12:00:00.000Z',
    )

    const refreshBtn = wrapper.find('[data-testid="refresh-health-btn"]')
    expect(refreshBtn.exists()).toBe(true)
    await refreshBtn.trigger('click')
    await flushPromises()

    shouldFailHealth = true
    const originalFetch = globalThis.$fetch
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(new Error('Falha de rede')))
    await manualFetchBtn.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Não foi possível verificar a saúde do servidor.')
    vi.stubGlobal('$fetch', originalFetch)
    shouldFailHealth = false
  })

  it('renderiza o layout padrão, AppRoot e ErrorPage corretamente', async () => {
    const layoutWrapper = await mountSuspended(DefaultLayout, {
      slots: {
        default: () => 'Conteúdo interno',
      },
    })
    expect(layoutWrapper.text()).toContain('Conteúdo interno')

    const appWrapper = await mountSuspended(AppRoot)
    expect(appWrapper.exists()).toBe(true)

    const mockError = {
      status: 404,
      statusCode: 404,
      statusMessage: 'Not Found',
      message: 'Page not found',
      name: 'NuxtError',
      fatal: false,
      unhandled: false,
      toJSON: () => ({
        message: 'Page not found',
        statusCode: 404,
      }),
    } as unknown as NuxtError

    const errorWrapper = await mountSuspended(ErrorPage, {
      props: {
        error: mockError,
      },
    })
    expect(errorWrapper.text()).toContain('404')
  })
})
