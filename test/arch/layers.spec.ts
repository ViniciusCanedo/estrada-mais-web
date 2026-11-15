import { createRequire } from 'node:module'
import { cruise, type IConfiguration } from 'dependency-cruiser'
import { describe, expect, it } from 'vitest'

const requireConfig = createRequire(import.meta.url)
const depcruiseConfig = requireConfig('../../.dependency-cruiser.cjs') as IConfiguration

describe('Arquitetura de Camadas (dependency-cruiser)', () => {
  it('não possui violações de dependência entre app, server e shared', async () => {
    const result = await cruise(['app', 'server', 'shared'], depcruiseConfig)

    expect(result.output).toBeDefined()
    if (typeof result.output !== 'string') {
      expect(result.output.summary.error).toBe(0)
    }
  })

  it('protege componentes contra I/O direto em shared/http e shared/lib', () => {
    const rule = depcruiseConfig.forbidden?.find((item) => item.name === 'components-no-direct-io')

    expect(rule).toBeDefined()
    expect(rule?.to.path).toBe('^(app/pages|shared/(http|lib))')
  })
})
