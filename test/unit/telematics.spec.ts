import { describe, expect, it } from 'vitest'
import {
  tripFilterQuerySchema,
  tripIdParamsSchema,
  tripPayloadSchema,
} from '../../shared/schemas/trip.schema'
import {
  calculateTripListSummary,
  calculateTripTelematics,
  formatLocation,
  isValidBrazilianState,
  normalizeSearchText,
  parseCityAndState,
  tryParseCityAndState,
} from '../../shared/utils/telematics'

describe('Utilitários de Telemetria Puros (shared/utils/telematics)', () => {
  it('deve extrair e normalizar cidade e UF válidas em parseCityAndState', () => {
    expect(parseCityAndState('Santos, SP')).toEqual({ city: 'Santos', state: 'SP' })
    expect(parseCityAndState('  São José dos Campos, sp  ')).toEqual({
      city: 'São José dos Campos',
      state: 'SP',
    })
    expect(parseCityAndState('Rondonópolis, MT')).toEqual({ city: 'Rondonópolis', state: 'MT' })
    expect(formatLocation('Santos', 'SP')).toBe('Santos, SP')
    expect(isValidBrazilianState('SP')).toBe(true)
    expect(isValidBrazilianState('XX')).toBe(false)
  })

  it('deve rejeitar localizações inválidas ou com UF inexistente em parseCityAndState', () => {
    expect(tryParseCityAndState('Santos')).toBeNull()
    expect(tryParseCityAndState(', SP')).toBeNull()
    expect(tryParseCityAndState('   , SP')).toBeNull()
    expect(tryParseCityAndState('Santos, ')).toBeNull()
    expect(tryParseCityAndState('Santos, XX')).toBeNull()

    expect(() => parseCityAndState('Santos')).toThrow(RangeError)
    expect(() => parseCityAndState('Santos, ZZ')).toThrow(RangeError)
  })

  it('deve normalizar texto removendo diacríticos e caixa para busca textual', () => {
    expect(normalizeSearchText('  Rondonópolis, MT ')).toBe('rondonopolis, mt')
    expect(normalizeSearchText('São Paulo')).toBe('sao paulo')
  })

  it('deve calcular distância, km/L e R$/km corretamente para viagem válida', () => {
    const result = calculateTripTelematics({
      kmStart: 784320,
      kmEnd: 786060,
      fuelLiters: 722,
      fuelCostReais: 3465,
      tollCostReais: 412,
    })

    expect(result.isValidDistance).toBe(true)
    expect(result.distanceKm).toBe(1740)
    expect(result.kmPerLiter).toBeCloseTo(2.41, 2)
    expect(result.costPerKmReais).toBeCloseTo(2.22816, 4)
  })

  it('deve proteger contra divisão por zero, odômetro inválido e NaN em calculateTripTelematics', () => {
    expect(
      calculateTripTelematics({
        kmStart: 786060,
        kmEnd: 786060,
        fuelLiters: 722,
        fuelCostReais: 3465,
        tollCostReais: 412,
      }),
    ).toEqual({
      isValidDistance: false,
      distanceKm: 0,
      kmPerLiter: 0,
      costPerKmReais: 0,
    })

    expect(
      calculateTripTelematics({
        kmStart: 786060,
        kmEnd: 784320,
        fuelLiters: 722,
        fuelCostReais: 3465,
        tollCostReais: 412,
      }),
    ).toEqual({
      isValidDistance: false,
      distanceKm: 0,
      kmPerLiter: 0,
      costPerKmReais: 0,
    })

    expect(
      calculateTripTelematics({
        kmStart: -10,
        kmEnd: 100,
        fuelLiters: 50,
        fuelCostReais: 200,
        tollCostReais: 0,
      }),
    ).toEqual({
      isValidDistance: false,
      distanceKm: 0,
      kmPerLiter: 0,
      costPerKmReais: 0,
    })

    expect(
      calculateTripTelematics({
        kmStart: Number.NaN,
        kmEnd: 100,
        fuelLiters: 50,
        fuelCostReais: 200,
        tollCostReais: 0,
      }).isValidDistance,
    ).toBe(false)

    const zeroFuel = calculateTripTelematics({
      kmStart: 100,
      kmEnd: 200,
      fuelLiters: 0,
      fuelCostReais: 0.1,
      tollCostReais: 0.2,
    })
    expect(zeroFuel.isValidDistance).toBe(true)
    expect(zeroFuel.distanceKm).toBe(100)
    expect(zeroFuel.kmPerLiter).toBe(0)
    expect(zeroFuel.costPerKmReais).toBeCloseTo(0.003, 6)
    expect(Number.isNaN(zeroFuel.kmPerLiter)).toBe(false)
  })

  it('deve calcular totalizadores com média ponderada real e zerar em lista vazia', () => {
    expect(calculateTripListSummary([])).toEqual({
      totalDistanceKm: 0,
      weightedAverageKmL: 0,
      totalFuelCostReais: 0,
      totalTollCostReais: 0,
      totalFreightValueReais: 0,
      weightedCostPerKmReais: 0,
    })

    const summary = calculateTripListSummary([
      {
        distanceKm: 1740,
        fuelLiters: 722.0,
        fuelCostReais: 3465,
        tollCostReais: 412,
        freightValueReais: 18500,
      },
      {
        distanceKm: 520,
        fuelLiters: 203.9,
        fuelCostReais: 980,
        tollCostReais: 184,
        freightValueReais: 6800,
      },
      {
        distanceKm: 495,
        fuelLiters: 208.0,
        fuelCostReais: 998,
        tollCostReais: 152,
        freightValueReais: 6200,
      },
      {
        distanceKm: 440,
        fuelLiters: 193.0,
        fuelCostReais: 925,
        tollCostReais: 138,
        freightValueReais: 5900,
      },
      {
        distanceKm: 560,
        fuelLiters: 225.8,
        fuelCostReais: 1085,
        tollCostReais: 96,
        freightValueReais: 6900,
      },
    ])

    expect(summary.totalDistanceKm).toBe(3755)
    expect(summary.weightedAverageKmL).toBeCloseTo(3755 / 1552.7, 6)
    expect(summary.weightedAverageKmL).toBeCloseTo(2.42, 2)
    expect(summary.totalFuelCostReais).toBe(7453)
    expect(summary.totalTollCostReais).toBe(982)
    expect(summary.totalFreightValueReais).toBe(44300)
    expect(summary.weightedCostPerKmReais).toBeCloseTo(8435 / 3755, 6)

    // Garante distinção entre média ponderada e média aritmética simples (1000/100=10 e 100/100=10? Ex.: 900/300=3 e 100/100=1 -> ponderada=2.5, simples=2.0)
    const weightedVsSimple = calculateTripListSummary([
      {
        distanceKm: 900,
        fuelLiters: 300,
        fuelCostReais: 1500,
        tollCostReais: 0,
        freightValueReais: 4000,
      },
      {
        distanceKm: 100,
        fuelLiters: 100,
        fuelCostReais: 500,
        tollCostReais: 0,
        freightValueReais: 1000,
      },
    ])
    expect(weightedVsSimple.weightedAverageKmL).toBeCloseTo(2.5, 6)
  })
})

describe('Schemas Zod de Viagens (shared/schemas/trip.schema)', () => {
  it('deve validar payload completo e aplicar defaults de frete e pedágio', () => {
    const parsed = tripPayloadSchema.parse({
      tripDate: '2026-09-15',
      invoiceNumber: ' 10824 ',
      origin: 'Santos, SP',
      destination: 'Rondonópolis, MT',
      cargoWeightTons: 32.4,
      kmStart: 784320,
      kmEnd: 786060,
      fuelLiters: 722,
      fuelCostReais: 3465,
    })

    expect(parsed.invoiceNumber).toBe('10824')
    expect(parsed.freightValueReais).toBe(0)
    expect(parsed.tollCostReais).toBe(0)
  })

  it('deve rejeitar kmEnd <= kmStart, data de calendário inexistente, UF inválida e diesel irrisório', () => {
    const equalKm = tripPayloadSchema.safeParse({
      tripDate: '2026-09-15',
      origin: 'Santos, SP',
      destination: 'Rondonópolis, MT',
      kmStart: 784320,
      kmEnd: 784320,
      fuelLiters: 722,
      fuelCostReais: 3465,
    })
    expect(equalKm.success).toBe(false)
    expect(equalKm.error?.issues[0]?.message).toBe(
      'O KM final deve ser maior que o KM inicial (odômetro não pode retroceder).',
    )

    const invalidCalendar = tripPayloadSchema.safeParse({
      tripDate: '2026-02-30',
      origin: 'Santos, SP',
      destination: 'Rondonópolis, MT',
      kmStart: 100,
      kmEnd: 200,
      fuelLiters: 50,
      fuelCostReais: 300,
    })
    expect(invalidCalendar.success).toBe(false)

    const invalidUf = tripPayloadSchema.safeParse({
      tripDate: '2026-09-15',
      origin: 'Santos, XX',
      destination: 'Rondonópolis, MT',
      kmStart: 100,
      kmEnd: 200,
      fuelLiters: 50,
      fuelCostReais: 300,
    })
    expect(invalidUf.success).toBe(false)

    const tinyFuel = tripPayloadSchema.safeParse({
      tripDate: '2026-09-15',
      origin: 'Santos, SP',
      destination: 'Rondonópolis, MT',
      kmStart: 100,
      kmEnd: 200,
      fuelLiters: 0.01,
      fuelCostReais: 1,
    })
    expect(tinyFuel.success).toBe(false)
  })

  it('deve validar query de filtros e parâmetros de ID em pt-BR', () => {
    expect(tripFilterQuerySchema.parse({})).toEqual({
      period: 'month',
      state: 'TODOS',
      sortBy: 'tripDate',
      sortDir: 'desc',
    })

    expect(
      tripFilterQuerySchema.parse({
        month: '2026-09',
        period: 'last90days',
        search: ' Santos ',
        state: ' mt ',
        sortBy: 'kmPerLiter',
        sortDir: 'asc',
      }),
    ).toEqual({
      month: '2026-09',
      period: 'last90days',
      search: 'Santos',
      state: 'MT',
      sortBy: 'kmPerLiter',
      sortDir: 'asc',
    })

    expect(tripFilterQuerySchema.safeParse({ state: 'XX' }).success).toBe(false)
    expect(tripIdParamsSchema.parse({ id: '42' })).toEqual({ id: 42 })
    expect(tripIdParamsSchema.safeParse({ id: '0' }).success).toBe(false)
    expect(tripIdParamsSchema.safeParse({ id: 'abc' }).success).toBe(false)
  })
})
