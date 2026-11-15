# Diretório `test/e2e/`

O diretório `test/e2e/` armazena os **testes ponta a ponta (End-to-End / E2E)** e testes de integração de servidor/SSR que validam a aplicação Nuxt completa rodando como um servidor real.

> Documentação oficial: [Nuxt 4 — Testing (`@nuxt/test-utils/e2e`)](https://nuxt.com/docs/4.x/getting-started/testing#end-to-end-testing)

## O Que Testar em `test/e2e/`

- Jornadas críticas do usuário no navegador (login, checkout, navegação entre páginas).
- Renderização no lado do servidor (SSR), cabeçalhos HTTP, status codes e metatags de SEO.
- Contratos reais das rotas de API (`server/api/` e `server/routes/`).

## Regras de Criação de Arquivos

1. **Nomenclatura**:
   - Nomeie os arquivos em **kebab-case** com sufixo `.test.ts` ou `.spec.ts` (ex.: `home-ssr.test.ts`, `auth-journey.test.ts`).
2. **Ambiente e Imports**:
   - Estes testes rodam no ambiente **`node`** do Vitest (ou via Playwright Test Runner).
   - Importe os utilitários exclusivamente de **`@nuxt/test-utils/e2e`** (`setup`, `$fetch`, `fetch`, `url`, `createPage`).
   - **Nunca** importe `@nuxt/test-utils/runtime` (como `mountSuspended`) dentro de `test/e2e/`.

## Exemplo de Uso

```ts
// test/e2e/ssr.test.ts
import { describe, expect, it } from 'vitest'
import { $fetch, setup } from '@nuxt/test-utils/e2e'

describe('Renderização SSR da Página Inicial', async () => {
  await setup({
    server: true,
  })

  it('renderiza a página inicial com sucesso', async () => {
    const html = await $fetch('/')
    expect(html).toContain('<!DOCTYPE html>')
  })
})
```

## Boas Práticas

- **Agrupe Testes que Compartilham o Mesmo `setup()`**: Como o `setup()` realiza o build/inicialização do servidor Nuxt, agrupe testes relacionados dentro do mesmo bloco `describe` para evitar subir o servidor repetidas vezes desnecessariamente.
- **Seletores Resilientes no Browser**: Ao usar `createPage()` com Playwright, prefira seletores baseados em acessibilidade (`getByRole`, `getByLabel`, `getByText`) em vez de classes CSS ou seletores frágeis de estrutura DOM.
