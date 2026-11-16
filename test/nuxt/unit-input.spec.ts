import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import AppRoadDivider from '~/components/ui/AppRoadDivider.vue'
import AppUnitInput from '~/components/ui/AppUnitInput.vue'

describe('Componentes Base UI (AppUnitInput e AppRoadDivider)', () => {
  it('deve renderizar AppUnitInput em estado padrão com sufixo e atualizar v-model', async () => {
    const wrapper = await mountSuspended(AppUnitInput, {
      props: {
        id: 'odometer-start',
        label: 'Odômetro Inicial',
        suffix: 'km',
        modelValue: '784.320',
      },
      slots: {
        hint: () => 'Estado Normal / Padrão',
      },
    })

    const label = wrapper.find('label')
    const input = wrapper.find('input')

    expect(label.attributes('for')).toBe('odometer-start')
    expect(input.attributes('id')).toBe('odometer-start')
    expect(wrapper.text()).toContain('Odômetro Inicial')
    expect(wrapper.text()).toContain('km')
    expect(wrapper.text()).toContain('Estado Normal / Padrão')

    await input.setValue('785.000')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['785.000'])
  })

  it('deve renderizar AppUnitInput com prefixo monetário e destaque ativo no tom expense', async () => {
    const wrapper = await mountSuspended(AppUnitInput, {
      props: {
        id: 'fuel-cost',
        label: 'Custo do Abastecimento',
        prefix: 'R$',
        tone: 'expense',
        active: true,
        modelValue: '3.465,00',
      },
    })

    expect(wrapper.text()).toContain('R$')
    expect(wrapper.find('label span').classes()).toContain('text-expense-blue')
    expect(wrapper.find('input').attributes('aria-invalid')).toBeUndefined()
  })

  it('deve exibir estado de erro com alerta acessível e destaque vermelho', async () => {
    const wrapper = await mountSuspended(AppUnitInput, {
      props: {
        id: 'odometer-end',
        label: 'KM Final',
        suffix: 'km',
        modelValue: '783.100',
        error: 'Erro: KM final não pode retroceder',
      },
    })

    const input = wrapper.find('input')
    const alert = wrapper.find('[role="alert"]')

    expect(input.attributes('aria-invalid')).toBe('true')
    expect(input.classes()).toContain('text-highway-red')
    expect(alert.exists()).toBe(true)
    expect(alert.text()).toBe('Erro: KM final não pode retroceder')
    expect(alert.classes()).toContain('font-mono')
  })

  it('deve desabilitar o input quando disabled for verdadeiro', async () => {
    const wrapper = await mountSuspended(AppUnitInput, {
      props: {
        id: 'avg-calc',
        label: 'Cálculo Automático',
        suffix: 'km/L',
        disabled: true,
        modelValue: '2,41',
      },
    })

    const input = wrapper.find('input')

    expect(input.attributes('disabled')).toBeDefined()
    expect(input.classes()).toContain('cursor-not-allowed')
  })

  it('deve renderizar AppRoadDivider nas variantes padrão e sutil', async () => {
    const standardWrapper = await mountSuspended(AppRoadDivider)
    const subtleWrapper = await mountSuspended(AppRoadDivider, {
      props: { subtle: true },
    })

    expect(standardWrapper.find('div').classes()).toContain('road-divider')
    expect(subtleWrapper.find('div').classes()).toContain('road-divider-subtle')
  })
})
