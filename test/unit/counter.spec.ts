import { describe, expect, it, vi } from 'vitest'
import { getGetHealthUrl, getHealth } from '../../shared/http/system/system'
import {
  customFetch,
  normalizeHeaders,
  resolveBaseUrl,
  resolveSsrHeaders,
} from '../../shared/lib/client'
import { getHealthStatus } from '../../server/services/health.service'
import { healthResponseSchema } from '../../shared/utils/health-schema'

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>
  if (!g.defineEventHandler) {
    g.defineEventHandler = <T>(handler: T): T => handler
  }
})

describe('Orval URL Helpers, Schemas, Services e HTTP Client (Node Unit)', () => {
  it('retorna o caminho relativo esperado para o endpoint de health', () => {
    expect(getGetHealthUrl()).toBe('/health')
  })

  it('valida o payload do health check com o schema Zod compartilhado e service', async () => {
    const valid = healthResponseSchema.parse({
      status: 'ok',
      timestamp: '2026-10-25T00:00:00.000Z',
    })
    expect(valid.status).toBe('ok')

    const serviceResult = getHealthStatus()
    expect(serviceResult.status).toBe('ok')

    const { default: healthHandler } = await import('../../server/api/health.get')
    const handlerResult = healthHandler({} as Parameters<typeof healthHandler>[0]) as {
      status: string
      timestamp: string
    }
    expect(handlerResult.status).toBe('ok')
  })

  it('resolveBaseUrl retorna o runtimeConfig quando disponível ou fallback /api', () => {
    expect(resolveBaseUrl()).toBe('/api')

    vi.stubGlobal('useRuntimeConfig', () => ({ public: { apiBase: '/v2' } }))
    expect(resolveBaseUrl()).toBe('/v2')

    vi.stubGlobal('useRuntimeConfig', () => ({ public: { apiBase: '' } }))
    expect(resolveBaseUrl()).toBe('/api')

    vi.unstubAllGlobals()
  })

  it('resolveSsrHeaders extrai cookie e authorization em SSR ou retorna objeto vazio em fallback', () => {
    expect(resolveSsrHeaders(false)).toEqual({})
    expect(resolveSsrHeaders(true)).toEqual({})

    vi.stubGlobal('useRequestHeaders', () => ({
      cookie: 'sid=123',
      authorization: 'Bearer token',
    }))
    expect(resolveSsrHeaders(true)).toEqual({
      cookie: 'sid=123',
      authorization: 'Bearer token',
    })

    vi.stubGlobal('useRequestHeaders', () => ({}))
    expect(resolveSsrHeaders(true)).toEqual({})

    vi.unstubAllGlobals()
  })

  it('normalizeHeaders converte undefined, Headers, tuplas e objetos planos', () => {
    expect(normalizeHeaders()).toEqual({})

    const headersInstance = new Headers({ 'x-test': '123' })
    expect(normalizeHeaders(headersInstance)).toEqual({ 'x-test': '123' })

    expect(normalizeHeaders([['x-tuple', 'abc']])).toEqual({ 'x-tuple': 'abc' })
    expect(normalizeHeaders({ 'x-plain': 'xyz' })).toEqual({ 'x-plain': 'xyz' })
  })

  it('customFetch e getHealth delegam chamadas ao $fetch global com opções normalizadas', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 'ok',
      timestamp: '2026-10-25T00:00:00.000Z',
    })
    vi.stubGlobal('$fetch', fetchMock)

    const result = await getHealth({
      headers: { 'x-req-id': 'req-1' },
    })

    expect(result).toEqual({
      status: 'ok',
      timestamp: '2026-10-25T00:00:00.000Z',
    })
    expect(fetchMock).toHaveBeenCalledWith('/health', {
      baseURL: '/api',
      method: 'GET',
      headers: { 'x-req-id': 'req-1' },
    })

    const controller = new AbortController()
    await customFetch('/custom', {
      method: 'post',
      body: JSON.stringify({ ok: true }),
      signal: controller.signal,
    })

    expect(fetchMock).toHaveBeenCalledWith('/custom', {
      baseURL: '/api',
      method: 'POST',
      body: JSON.stringify({ ok: true }),
      signal: controller.signal,
      headers: {},
    })

    vi.unstubAllGlobals()
  })
})
