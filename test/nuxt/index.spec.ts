import type { NuxtError } from '#app'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import AppRoot from '~/app.vue'
import ErrorPage from '~/error.vue'
import DefaultLayout from '~/layouts/default.vue'
import IndexPage from '~/pages/index.vue'
import { useCounterStore } from '~/stores/counter'

registerEndpoint('/api/health', () => ({
  status: 'ok',
  timestamp: '2026-10-23T00:00:00.000Z',
}))

describe('Página Inicial e Componentes Globais (Nuxt Runtime)', () => {
  it('renderiza o cabeçalho do scaffolding, interage com a store Pinia e executa fetch manual', async () => {
    const wrapper = await mountSuspended(IndexPage)

    expect(wrapper.text()).toContain('Nuxt 4 Scaffolding')
    expect(wrapper.find('[data-testid="counter-value"]').text()).toContain('0')

    const incrementBtn = wrapper.find('[data-testid="increment-btn"]')
    await incrementBtn.trigger('click')
    expect(wrapper.find('[data-testid="counter-value"]').text()).toContain('1')

    const store = useCounterStore()
    expect(store.doubleCount).toBe(2)

    const resetBtn = wrapper.find('[data-testid="reset-btn"]')
    await resetBtn.trigger('click')
    expect(wrapper.find('[data-testid="counter-value"]').text()).toContain('0')

    const buttons = wrapper.findAll('button')
    const manualFetchBtn = buttons.find((btn) => btn.text().includes('Testar $fetch'))
    expect(manualFetchBtn).toBeDefined()
    await manualFetchBtn?.trigger('click')
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
