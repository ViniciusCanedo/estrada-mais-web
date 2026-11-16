import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { readBody } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TripDto, TripPayloadInput } from '#shared/schemas/trip.schema'
import TripFormModal from '~/components/trips/TripFormModal.vue'
import { useAuthSession } from '~/composables/useAuthSession'
import { useCompetencePeriod } from '~/composables/useCompetencePeriod'
import { useGlobalModals } from '~/composables/useGlobalModals'
import { useTripModalState } from '~/composables/useTrips'
import DefaultLayout from '~/layouts/default.vue'

const SAMPLE_TRIP: TripDto = {
  id: 10,
  driverId: 1,
  tripDate: '2026-09-15',
  invoiceNumber: '10824',
  origin: 'Santos, SP',
  originCity: 'Santos',
  originState: 'SP',
  destination: 'Rondonópolis, MT',
  destinationCity: 'Rondonópolis',
  destinationState: 'MT',
  cargoWeightTons: 32.4,
  freightValueReais: 18500,
  tollCostReais: 412,
  kmStart: 784320,
  kmEnd: 786060,
  distanceKm: 1740,
  fuelLiters: 722,
  fuelCostReais: 3465,
  kmPerLiter: 1740 / 722,
  costPerKmReais: (3465 + 412) / 1740,
  createdAt: '2026-09-16T12:00:00.000Z',
  updatedAt: '2026-09-16T12:00:00.000Z',
}

let healthTripsCount = 5
let failPostTrip = false

registerEndpoint('/api/auth/me', () => ({
  data: {
    id: 1,
    name: 'Valdir Silveira',
    email: 'valdir.silveira.truck@estrada.com.br',
    initials: 'VS',
    vehicleSummary: 'Scania R450 • 6x2',
  },
}))

registerEndpoint('/api/auth/logout', { method: 'POST', handler: () => ({ success: true }) })

registerEndpoint('/api/health', () => ({
  status: 'ok',
  database: 'connected',
  timestamp: '2026-09-16T12:00:00.000Z',
  navigationCounts: { tripsCount: healthTripsCount, expensesCount: 10 },
}))

registerEndpoint('/api/trips', {
  method: 'POST',
  handler: async (event) => {
    if (failPostTrip) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Erro ao gravar viagem.',
        data: { message: 'Erro ao gravar viagem.' },
      })
    }
    const body = await readBody<TripPayloadInput>(event)
    healthTripsCount += 1
    return {
      data: {
        ...SAMPLE_TRIP,
        tripDate: body.tripDate,
        origin: body.origin,
        destination: body.destination,
        kmStart: body.kmStart,
        kmEnd: body.kmEnd,
        distanceKm: body.kmEnd - body.kmStart,
      },
    }
  },
})

registerEndpoint('/api/trips/10', {
  method: 'PUT',
  handler: async (event) => {
    const body = await readBody<TripPayloadInput>(event)
    return {
      data: {
        ...SAMPLE_TRIP,
        tripDate: body.tripDate,
        origin: body.origin,
        destination: body.destination,
        kmStart: body.kmStart,
        kmEnd: body.kmEnd,
        distanceKm: body.kmEnd - body.kmStart,
      },
    }
  },
})

describe('TripFormModal (test/nuxt/trip-modal.spec.ts)', () => {
  beforeEach(() => {
    healthTripsCount = 5
    failPostTrip = false
    useCompetencePeriod().setMonth('2026-09')
    useGlobalModals().closeModals()
    const auth = useAuthSession()
    auth.user.value = {
      id: 1,
      name: 'Valdir Silveira',
      email: 'valdir.silveira.truck@estrada.com.br',
      initials: 'VS',
      vehicleSummary: 'Scania R450 • 6x2',
    }
    auth.hasLoadedSession.value = true
  })

  it('deve calcular telemetria ao vivo e bloquear envio quando KM final <= KM inicial', async () => {
    const wrapper = await mountSuspended(TripFormModal, {
      props: {
        open: true,
        portal: false,
        defaultMonth: '2026-09',
      },
    })

    expect(wrapper.text()).toContain('Registrar Nova Viagem')
    expect(wrapper.find('[data-testid="modal-log-trip"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="trip-live-distance"]').text()).toBe('-- km')
    expect(wrapper.find('[data-testid="trip-live-efficiency"]').text()).toBe('-- km/L')

    await wrapper.find('[data-testid="trip-date-input"]').setValue('2026-09-17')
    await wrapper.find('[data-testid="trip-invoice-input"]').setValue('10824')
    await wrapper.find('[data-testid="trip-origin-input"]').setValue('Santos, SP')
    await wrapper.find('[data-testid="trip-destination-input"]').setValue('Rondonópolis, MT')
    await wrapper.find('[data-testid="trip-cargo-input"]').setValue('32.4')
    await wrapper.find('[data-testid="trip-freight-input"]').setValue('18500')
    await wrapper.find('[data-testid="trip-toll-input"]').setValue('412')
    await wrapper.find('[data-testid="trip-km-start-input"]').setValue('784320')
    await wrapper.find('[data-testid="trip-km-end-input"]').setValue('786060')
    await wrapper.find('[data-testid="trip-fuel-liters-input"]').setValue('722')
    await wrapper.find('[data-testid="trip-fuel-cost-input"]').setValue('3465')

    expect(wrapper.find('[data-testid="trip-live-distance"]').text()).toBe('1.740 km')
    expect(wrapper.find('[data-testid="trip-live-efficiency"]').text()).toBe('2,41 km/L')

    // Odômetro invertido exibe texto vermelho e impede envio
    await wrapper.find('[data-testid="trip-km-end-input"]').setValue('784000')
    const invalidDistance = wrapper.find('[data-testid="trip-live-distance"]')
    expect(invalidDistance.text()).toBe('Inválido (End ≤ Start)')
    expect(invalidDistance.classes()).toContain('text-highway-red')
    expect(wrapper.find('[data-testid="trip-live-efficiency"]').text()).toBe('-- km/L')

    await wrapper.find('form').trigger('submit')
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain(
        'O KM final deve ser maior que o KM inicial (odômetro não pode retroceder).',
      )
      expect(
        (wrapper.find('[data-testid="trip-km-end-input"]').element as HTMLInputElement).disabled,
      ).toBe(false)
    })
    expect(wrapper.emitted('submit')).toBeUndefined()

    // Corrige odômetro e submete payload válido
    await wrapper.find('[data-testid="trip-km-end-input"]').setValue('786060')
    await wrapper.find('form').trigger('submit')
    await vi.waitFor(() => {
      expect(wrapper.emitted('submit')).toHaveLength(1)
    })

    const submitted = wrapper.emitted('submit')?.[0]?.[0] as TripPayloadInput
    expect(submitted.origin).toBe('Santos, SP')
    expect(submitted.freightValueReais).toBe(18500)
    expect(submitted.kmEnd).toBe(786060)
  })

  it('deve preencher formulário no modo edição, exibir alerta de erro e emitir close ao cancelar', async () => {
    const wrapper = await mountSuspended(TripFormModal, {
      props: {
        open: true,
        portal: false,
        editingTrip: SAMPLE_TRIP,
        errorMessage: 'Falha simulada ao salvar.',
      },
    })

    expect(wrapper.text()).toContain('Editar Viagem')
    expect(wrapper.find('[data-testid="trip-modal-error"]').text()).toContain(
      'Falha simulada ao salvar.',
    )
    expect(
      (wrapper.find('[data-testid="trip-origin-input"]').element as HTMLInputElement).value,
    ).toBe('Santos, SP')
    expect(wrapper.find('[data-testid="trip-live-distance"]').text()).toBe('1.740 km')

    await wrapper.find('[data-testid="trip-modal-cancel-btn"]').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('deve abrir modal pelo DefaultLayout, salvar viagem via API e atualizar contador na Sidebar', async () => {
    const layoutWrapper = await mountSuspended(DefaultLayout, {
      slots: {
        default: () => 'Conteúdo Viagens',
      },
    })
    await flushPromises()
    expect(layoutWrapper.find('[data-testid="sidebar-trips-count"]').text()).toBe('5')

    await layoutWrapper.find('[data-testid="open-trip-modal-btn"]').trigger('click')
    await flushPromises()
    expect(useGlobalModals().isTripModalOpen.value).toBe(true)

    const modalRoot = document.body.querySelector('[data-testid="modal-log-trip"]')
    expect(modalRoot).not.toBeNull()

    const fillBodyInput = async (testId: string, value: string): Promise<void> => {
      const input = document.body.querySelector(
        `[data-testid="${testId}"]`,
      ) as HTMLInputElement | null
      expect(input).not.toBeNull()
      if (!input) {
        return
      }
      input.value = value
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new Event('change', { bubbles: true }))
      await flushPromises()
    }

    await fillBodyInput('trip-date-input', '2026-09-17')
    await fillBodyInput('trip-origin-input', 'Santos, SP')
    await fillBodyInput('trip-destination-input', 'Rondonópolis, MT')
    await fillBodyInput('trip-km-start-input', '784320')
    await fillBodyInput('trip-km-end-input', '786060')
    await fillBodyInput('trip-fuel-liters-input', '722')
    await fillBodyInput('trip-fuel-cost-input', '3465')

    // Simula erro da API ao submeter
    failPostTrip = true
    const formEl = document.body.querySelector('[data-testid="modal-log-trip"] form')
    formEl?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await vi.waitFor(() => {
      const errBanner = document.body.querySelector('[data-testid="trip-modal-error"]')
      expect(errBanner?.textContent).toContain('Erro ao gravar viagem.')
    })

    // Submete com sucesso e verifica incremento do contador da Sidebar
    failPostTrip = false
    formEl?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await vi.waitFor(() => {
      expect(useGlobalModals().isTripModalOpen.value).toBe(false)
      expect(layoutWrapper.find('[data-testid="sidebar-trips-count"]').text()).toBe('6')
    })

    // Testa abertura em modo edição e atualização via PUT /api/trips/10
    useTripModalState().openEditTripModal(SAMPLE_TRIP)
    await flushPromises()
    expect(useGlobalModals().isTripModalOpen.value).toBe(true)

    const editForm = document.body.querySelector('[data-testid="modal-log-trip"] form')
    editForm?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await vi.waitFor(() => {
      expect(useGlobalModals().isTripModalOpen.value).toBe(false)
    })

    // Testa botão Cancelar fechando modal
    useTripModalState().openCreateTripModal()
    await flushPromises()
    const cancelBtn = document.body.querySelector(
      '[data-testid="trip-modal-cancel-btn"]',
    ) as HTMLButtonElement | null
    cancelBtn?.click()
    await flushPromises()
    expect(useGlobalModals().isTripModalOpen.value).toBe(false)

    layoutWrapper.unmount()
  })
})
