# Diretório `test/nuxt/`

O diretório `test/nuxt/` armazena os testes que **exigem o ambiente de runtime do Nuxt 4** (executados via Vitest com `environment: 'nuxt'` sob `happy-dom` ou `jsdom`).

> Documentação oficial: [Nuxt 4 — Testing in Nuxt Environment](https://nuxt.com/docs/4.x/getting-started/testing#unit-testing)

## Suporte Nativo a TypeScript

Por padrão no Nuxt 4, todos os arquivos dentro de `test/nuxt/` são incluídos automaticamente no contexto TypeScript da aplicação (`.nuxt/tsconfig.app.json`). Isso significa que:

- Aliases como `~/`, `@/`, `#imports` e `#components` funcionam nativamente.
- Todos os auto-imports de `app/` (`ref`, `useState`, composables e utilitários) são reconhecidos pelo TypeScript sem configuração extra.

## O Que Testar em `test/nuxt/`

- **Componentes Vue (`app/components/`, `app/layouts/`, `app/pages/`)**: Utilizando `mountSuspended` ou `renderSuspended`.
- **Composables (`app/composables/`)**: Que dependem de `useState`, `useFetch`, `useAsyncData`, `useNuxtApp` ou `useRuntimeConfig`.
- **Middlewares de Rota (`app/middleware/`) e Plugins (`app/plugins/`)**: Que utilizam helpers e injeções do Nuxt.

## Regras de Criação de Arquivos

1. **Nomenclatura**:
   - Nomeie os arquivos espelhando o componente ou composable testado com sufixo `.test.ts` ou `.spec.ts` (ex.: `BaseButton.test.ts`, `useAuth.test.ts`).
2. **Imports de Runtime**:
   - Importe os helpers exclusivamente de **`@nuxt/test-utils/runtime`**:
     - `mountSuspended`: Monta componentes Vue suportando `<script setup>` assíncrono e injeções de plugins do Nuxt.
     - `renderSuspended`: Renderiza componentes usando `@testing-library/vue` no contexto Nuxt.
     - `mockNuxtImport`: Cria mocks tipados para auto-imports do Nuxt.
     - `mockComponent`: Substitui um componente auto-importado por um stub.
     - `registerEndpoint`: Simula endpoints do Nitro para testar componentes/composables que fazem chamadas `useFetch`/`$fetch`.

## Exemplo de Uso

```ts
// test/nuxt/App.test.ts
import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import App from '~/app.vue'

describe('Componente Raiz (App)', () => {
  it('monta a aplicação na rota inicial', async () => {
    const wrapper = await mountSuspended(App, { route: '/' })
    expect(wrapper.exists()).toBe(true)
  })
})
```

## Boas Práticas

- **Cuidado com Estado Global (`useState`)**: Como o ambiente Nuxt é inicializado antes dos testes do arquivo, se um teste mutar um estado global compartilhado (`useState`), limpe-o em `beforeEach`/`afterEach` para não afetar os demais testes.
- **Se não precisa do Nuxt Runtime, use `test/unit/`**: Funções puras (como as de `shared/utils/` ou `app/utils/`) não devem ser colocadas em `test/nuxt/`, pois o ambiente Node puro de `test/unit/` executa muito mais rápido.
