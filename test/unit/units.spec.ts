import { describe, expect, it } from 'vitest'
import { BRAZILIAN_STATES, EXPENSE_CATEGORIES, PAYMENT_METHODS } from '../../shared/types/domain'
import {
  fromCents,
  fromDeciliters,
  fromKg,
  fromMilliKmL,
  toCents,
  toDeciliters,
  toKg,
  toMilliKmL,
} from '../../shared/utils/units'

describe('Conversores Numéricos Puros (shared/utils/units)', () => {
  it('deve converter reais para centavos evitando imprecisão IEEE 754', () => {
    expect(toCents(19.99)).toBe(1999)
    expect(toCents(3465.6)).toBe(346560)
    expect(toCents(0.1 + 0.2)).toBe(30)
    expect(toCents(10.234)).toBe(1023)
    expect(toCents(10.235)).toBe(1024)
  })

  it('deve converter centavos para reais mantendo precisão decimal', () => {
    expect(fromCents(1999)).toBeCloseTo(19.99, 10)
    expect(fromCents(346560)).toBeCloseTo(3465.6, 10)
    expect(fromCents(0)).toBe(0)
  })

  it('deve normalizar zero negativo e preservar valores negativos em centavos', () => {
    expect(Object.is(toCents(0), 0)).toBe(true)
    expect(Object.is(toCents(-0), 0)).toBe(true)
    expect(Object.is(toCents(-0.001), 0)).toBe(true)
    expect(Object.is(fromCents(-0), 0)).toBe(true)
    expect(toCents(-19.99)).toBe(-1999)
    expect(fromCents(-1999)).toBeCloseTo(-19.99, 10)
  })

  it('deve converter litros para decilitros e vice-versa', () => {
    expect(toDeciliters(722.0)).toBe(7220)
    expect(toDeciliters(0.3)).toBe(3)
    expect(Object.is(toDeciliters(-0), 0)).toBe(true)
    expect(toDeciliters(-12.5)).toBe(-125)

    expect(fromDeciliters(7220)).toBe(722)
    expect(fromDeciliters(3)).toBeCloseTo(0.3, 10)
    expect(Object.is(fromDeciliters(-0), 0)).toBe(true)
    expect(fromDeciliters(-125)).toBeCloseTo(-12.5, 10)
  })

  it('deve converter toneladas para quilogramas e vice-versa', () => {
    expect(toKg(32.4)).toBe(32400)
    expect(toKg(0.001)).toBe(1)
    expect(Object.is(toKg(-0), 0)).toBe(true)
    expect(toKg(-1.25)).toBe(-1250)

    expect(fromKg(32400)).toBeCloseTo(32.4, 10)
    expect(fromKg(1)).toBeCloseTo(0.001, 10)
    expect(Object.is(fromKg(-0), 0)).toBe(true)
    expect(fromKg(-1250)).toBeCloseTo(-1.25, 10)
  })

  it('deve converter consumo em km/L para milésimos de km/L e vice-versa', () => {
    expect(toMilliKmL(2.35)).toBe(2350)
    expect(toMilliKmL(1.855)).toBe(1855)
    expect(Object.is(toMilliKmL(-0), 0)).toBe(true)
    expect(toMilliKmL(-2.5)).toBe(-2500)

    expect(fromMilliKmL(2350)).toBeCloseTo(2.35, 10)
    expect(fromMilliKmL(1855)).toBeCloseTo(1.855, 10)
    expect(Object.is(fromMilliKmL(-0), 0)).toBe(true)
    expect(fromMilliKmL(-2500)).toBeCloseTo(-2.5, 10)
  })
})

describe('Constantes de Domínio (shared/types/domain)', () => {
  it('deve expor todas as categorias de despesa e meios de pagamento esperados', () => {
    expect(EXPENSE_CATEGORIES).toEqual([
      'combustivel',
      'pedagio',
      'borracharia',
      'manutencao',
      'alimentacao',
      'outros',
    ])
    expect(PAYMENT_METHODS).toEqual(['cartao_frota', 'cartao_debito', 'pix', 'dinheiro', 'boleto'])
  })

  it('deve conter exatamente as 27 UFs brasileiras sem duplicatas', () => {
    expect(BRAZILIAN_STATES).toHaveLength(27)
    expect(new Set(BRAZILIAN_STATES).size).toBe(27)
    expect(BRAZILIAN_STATES).toContain('SP')
    expect(BRAZILIAN_STATES).toContain('DF')
    expect(BRAZILIAN_STATES.every((uf) => /^[A-Z]{2}$/.test(uf))).toBe(true)
  })
})
