import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AppSidebar from '~/components/layout/AppSidebar.vue'
import AppTopBar from '~/components/layout/AppTopBar.vue'
import TelemetrySyncBadge from '~/components/layout/TelemetrySyncBadge.vue'
import { useAuthSession } from '~/composables/useAuthSession'
import { useCompetencePeriod } from '~/composables/useCompetencePeriod'
import { useGlobalModals } from '~/composables/useGlobalModals'
import DefaultLayout from '~/layouts/default.vue'
import DesignSystemPage from '~/pages/design-system.vue'
import ExpensesPage from '~/pages/expenses.vue'
import SettingsPage from '~/pages/settings.vue'
import TripsPage from '~/pages/trips.vue'

let healthFailure = false
let mockTripsCount = 18
let mockExpensesCount = 42

const MOCK_SESSION_USER = {
  id: 1,
  name: 'Valdir Silveira',
  email: 'valdir.silveira.truck@estrada.com.br',
  initials: 'VS',
  vehicleSummary: 'Scania R450 • 6x2',
}

registerEndpoint('/api/auth/me', () => ({ data: MOCK_SESSION_USER }))
registerEndpoint('/api/auth/logout', () => ({ success: true }))
registerEndpoint('/api/settings', () => ({
  data: {
    id: 1,
    name: 'Valdir Silveira',
    email: 'valdir.silveira.truck@estrada.com.br',
    rntrc: '58.912.440-TAC',
    vehicleModel: 'Scania R450 Highline 6x2 (2021)',
    vehiclePlates: 'BRA-2E19 / CUR-4901',
    targetConsumptionKmL: 2.35,
    maxCostPerKmReais: 5.1,
    updatedAt: '2026-09-16T12:00:00.000Z',
  },
}))

registerEndpoint('/api/health', () => {
  if (healthFailure) {
    throw createError({ statusCode: 503, statusMessage: 'Service Unavailable' })
  }
  return {
    status: 'ok',
    database: 'connected',
    timestamp: '2026-09-16T12:00:00.000Z',
    navigationCounts: {
      tripsCount: mockTripsCount,
      expensesCount: mockExpensesCount,
    },
  }
})

registerEndpoint('/api/trips', () => ({
  data: [],
  meta: {
    totalCount: 0,
    availableStates: [],
    summary: {
      totalDistanceKm: 0,
      weightedAverageKmL: 0,
      totalFuelCostReais: 0,
      totalTollCostReais: 0,
      totalFreightValueReais: 0,
      weightedCostPerKmReais: 0,
    },
  },
}))

describe('Layout Night Highway, Navegação e Catálogo Design System', () => {
  beforeEach(() => {
    healthFailure = false
    mockTripsCount = 18
    mockExpensesCount = 42
    useCompetencePeriod().setMonth('2026-09')
    useGlobalModals().closeModals()
    const auth = useAuthSession()
    auth.user.value = { ...MOCK_SESSION_USER }
    auth.hasLoadedSession.value = true
  })

  it('deve exibir SYNC OK e OFFLINE / ERRO SYNC corretamente no TelemetrySyncBadge', async () => {
    const okWrapper = await mountSuspended(TelemetrySyncBadge, {
      props: {
        isOnline: true,
        isHealthy: true,
        lastSyncLabel: 'Há 2 min',
      },
    })
    expect(okWrapper.text()).toContain('SYNC OK')
    expect(okWrapper.text()).toContain('Há 2 min')
    expect(okWrapper.text()).toContain('ONLINE')
    expect(okWrapper.find('.radar-pulse').exists()).toBe(true)

    const apiFailWrapper = await mountSuspended(TelemetrySyncBadge, {
      props: {
        isOnline: true,
        isHealthy: false,
        lastSyncLabel: 'Há 5 min',
      },
    })
    expect(apiFailWrapper.text()).toContain('OFFLINE / ERRO SYNC')
    expect(apiFailWrapper.text()).toContain('Falha ao consultar API')

    const offlineWrapper = await mountSuspended(TelemetrySyncBadge, {
      props: {
        isOnline: false,
        isHealthy: true,
        lastSyncLabel: 'Há 5 min',
      },
    })
    expect(offlineWrapper.text()).toContain('OFFLINE / ERRO SYNC')
    expect(offlineWrapper.text()).toContain('Sem conexão de rede')
  })

  it('deve exibir Sistema de Design [SPEC] apenas em dev e emitir logout ao clicar Desconectar', async () => {
    const devWrapper = await mountSuspended(AppSidebar, {
      props: {
        tripsCount: 18,
        expensesCount: 42,
        isOnline: true,
        isHealthy: true,
        lastSyncLabel: 'Agora mesmo',
        isDev: true,
      },
    })

    expect(devWrapper.text()).toContain('ESTRADA')
    expect(devWrapper.find('[data-testid="sidebar-trips-count"]').text()).toBe('18')
    expect(devWrapper.find('[data-testid="sidebar-expenses-count"]').text()).toBe('42')
    expect(devWrapper.find('[data-testid="nav-design-system"]').exists()).toBe(true)
    expect(devWrapper.text()).toContain('SPEC')
    expect(devWrapper.text()).toContain('Valdir Silveira')
    expect(devWrapper.text()).toContain('VS')

    await devWrapper.find('[data-testid="logout-btn"]').trigger('click')
    expect(devWrapper.emitted('logout')).toHaveLength(1)

    const prodWrapper = await mountSuspended(AppSidebar, {
      props: {
        tripsCount: 18,
        expensesCount: 42,
        isOnline: true,
        isHealthy: true,
        lastSyncLabel: 'Agora mesmo',
        isDev: false,
      },
    })
    expect(prodWrapper.find('[data-testid="nav-design-system"]').exists()).toBe(false)
  })

  it('deve alternar competência mensal e disparar modais globais na AppTopBar', async () => {
    const topBarWrapper = await mountSuspended(AppTopBar)
    const { isExpenseModalOpen, isTripModalOpen } = useGlobalModals()

    expect(topBarWrapper.find('[data-testid="active-competence-label"]').text()).toBe(
      'SETEMBRO 2026',
    )

    await topBarWrapper.find('[data-testid="next-month-btn"]').trigger('click')
    expect(topBarWrapper.find('[data-testid="active-competence-label"]').text()).toBe(
      'OUTUBRO 2026',
    )

    await topBarWrapper.find('[data-testid="prev-month-btn"]').trigger('click')
    await topBarWrapper.find('[data-testid="prev-month-btn"]').trigger('click')
    expect(topBarWrapper.find('[data-testid="active-competence-label"]').text()).toBe('AGOSTO 2026')

    await topBarWrapper.find('[data-testid="open-expense-modal-btn"]').trigger('click')
    expect(isExpenseModalOpen.value).toBe(true)
    expect(isTripModalOpen.value).toBe(false)

    await topBarWrapper.find('[data-testid="open-trip-modal-btn"]').trigger('click')
    expect(isTripModalOpen.value).toBe(true)
    expect(isExpenseModalOpen.value).toBe(false)
  })

  it('deve sincronizar /api/health e responder a eventos de rede no DefaultLayout', async () => {
    const layoutWrapper = await mountSuspended(DefaultLayout, {
      slots: {
        default: () => 'Conteúdo principal',
      },
    })
    await flushPromises()

    expect(layoutWrapper.text()).toContain('Conteúdo principal')
    expect(layoutWrapper.find('[data-testid="sidebar-trips-count"]').text()).toBe('18')
    expect(layoutWrapper.find('[data-testid="sidebar-expenses-count"]').text()).toBe('42')
    expect(layoutWrapper.find('[data-testid="sync-status-indicator"]').text()).toContain('SYNC OK')

    window.dispatchEvent(new Event('offline'))
    await flushPromises()
    expect(layoutWrapper.find('[data-testid="sync-status-indicator"]').text()).toContain(
      'OFFLINE / ERRO SYNC',
    )

    healthFailure = true
    window.dispatchEvent(new Event('online'))
    await vi.waitFor(() => {
      expect(layoutWrapper.find('[data-testid="sync-status-indicator"]').text()).toContain(
        'OFFLINE / ERRO SYNC',
      )
    })

    healthFailure = false
    window.dispatchEvent(new Event('focus'))
    await vi.waitFor(() => {
      expect(layoutWrapper.find('[data-testid="sync-status-indicator"]').text()).toContain(
        'SYNC OK',
      )
    })

    await layoutWrapper.find('[data-testid="open-trip-modal-btn"]').trigger('click')
    await flushPromises()
    expect(useGlobalModals().isTripModalOpen.value).toBe(true)

    await layoutWrapper.find('[data-testid="open-expense-modal-btn"]').trigger('click')
    await flushPromises()
    expect(useGlobalModals().isExpenseModalOpen.value).toBe(true)

    await layoutWrapper.find('[data-testid="logout-btn"]').trigger('click')
    await flushPromises()
    expect(useGlobalModals().isExpenseModalOpen.value).toBe(false)
    expect(useAuthSession().user.value).toBeNull()

    layoutWrapper.unmount()
  })

  it('deve renderizar as 4 seções do catálogo Sistema de Design e os stubs de navegação', async () => {
    const dsWrapper = await mountSuspended(DesignSystemPage)

    expect(dsWrapper.text()).toContain('1. Paleta de Cores (OKLCH Tokens)')
    expect(dsWrapper.text()).toContain('2. Hierarquia Tipográfica')
    expect(dsWrapper.text()).toContain('3. Componentes de Formulário')
    expect(dsWrapper.text()).toContain('4. Sistema de Botões & Interação')
    expect(dsWrapper.text()).toContain('Erro: KM final não pode retroceder')

    const tripsWrapper = await mountSuspended(TripsPage)
    expect(tripsWrapper.text()).toContain('Viagens Registradas')
    await tripsWrapper.find('[data-testid="new-trip-btn"]').trigger('click')
    expect(useGlobalModals().isTripModalOpen.value).toBe(true)

    const expensesWrapper = await mountSuspended(ExpensesPage)
    expect(expensesWrapper.text()).toContain('Despesas Operacionais')
    await expensesWrapper.find('button').trigger('click')
    expect(useGlobalModals().isExpenseModalOpen.value).toBe(true)

    const settingsWrapper = await mountSuspended(SettingsPage)
    expect(settingsWrapper.text()).toContain('Perfil do Motorista')
  })
})
