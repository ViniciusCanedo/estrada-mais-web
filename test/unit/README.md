# Diretório `test/unit/`

O diretório `test/unit/` armazena os **testes unitários puros** da aplicação, que são executados diretamente no ambiente **Node** do Vitest (`environment: 'node'`), sem inicializar o runtime do Nuxt ou simulação de DOM.

> Documentação oficial: [Nuxt 4 — Organizing Your Tests (`test/unit`)](https://nuxt.com/docs/4.x/getting-started/testing#organizing-your-tests)

## O Que Testar em `test/unit/`

- Funções utilitárias compartilhadas em **`shared/utils/`** (validadores, formatadores, cálculos, transformações).
- Funções utilitárias puras de **`app/utils/`** e **`server/utils/`** que não dependem de auto-imports do runtime do Nuxt/Vue.
- Classes de domínio, parsers, máquinas de estado puras e schemas de validação (ex.: Zod).

## Regras de Criação de Arquivos

1. **Nomenclatura**:
   - Nomeie os arquivos espelhando o módulo testado com sufixo `.test.ts` ou `.spec.ts` (ex.: `currency.test.ts`, `validators.test.ts`).
2. **Zero Dependência do Runtime Nuxt**:
   - Testes em `test/unit/` **não devem** depender de auto-imports do Nuxt (`useNuxtApp`, `useState`, `useFetch`) nem montar componentes Vue.
   - Caso um teste precise do contexto do Nuxt ou de DOM (`happy-dom`), mova-o para `test/nuxt/`.
3. **Importações Explícitas**:
   - Importe explicitamente as funções testadas a partir do módulo de origem e as asserções do `vitest` (`describe`, `it`, `expect`, `vi`).

## Exemplo de Uso

```ts
// test/unit/string.test.ts
import { describe, expect, it } from 'vitest'
import { capitalize } from '../../shared/utils/string'

describe('capitalize()', () => {
  it('converte a primeira letra para maiúscula', () => {
    expect(capitalize('nuxt')).toBe('Nuxt')
  })

  it('retorna string vazia quando a entrada for vazia', () => {
    expect(capitalize('')).toBe('')
  })
})
```

## Boas Práticas

- **Velocidade Máxima**: Mantenha os testes em `test/unit/` livres de I/O de rede, banco de dados ou sistema de arquivos real (utilize `vi.fn()` / `vi.spyOn()` quando necessário).
- **Testes Determinísticos**: Evite depender do relógio real do sistema ou valores aleatórios sem controle; utilize `vi.useFakeTimers()` e `vi.setSystemTime()` para testar funções dependentes de data/hora.
