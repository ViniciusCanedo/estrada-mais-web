# Diretório `test/`

O diretório `test/` organiza todas as suítes de testes automatizados da aplicação (unitários, de integração com o runtime do Nuxt e ponta a ponta), seguindo a estrutura recomendada pela documentação oficial do **Nuxt 4** e do **`@nuxt/test-utils`**.

> Documentação oficial: [Nuxt 4 — `test`](https://nuxt.com/docs/4.x/directory-structure/test) | [Getting Started — Testing](https://nuxt.com/docs/4.x/getting-started/testing)

## Estrutura e Ambientes de Teste

O Nuxt 4 separa os testes em três subdiretórios de acordo com o ambiente de execução necessário no **Vitest**:

```text
test/
├── unit/            # Testes unitários rápidos em ambiente Node puro (sem runtime do Nuxt)
├── nuxt/            # Testes que exigem o ambiente de runtime do Nuxt (happy-dom / jsdom)
└── e2e/             # Testes ponta a ponta (E2E) contra a aplicação construída/em execução
```

| Subdiretório     | Ambiente Vitest      | Contexto TypeScript                                   | O que testar aqui                                                                                                |
| :--------------- | :------------------- | :---------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------- |
| **`test/unit/`** | `node`               | Node / Isolado                                        | Funções puras de `shared/utils/`, `app/utils/`, `server/utils/`, validadores e regras de negócio desacopladas    |
| **`test/nuxt/`** | `nuxt` (`happy-dom`) | Incluído automaticamente em `.nuxt/tsconfig.app.json` | Componentes Vue (`mountSuspended`), composables (`app/composables/`), plugins e middlewares com `mockNuxtImport` |
| **`test/e2e/`**  | `node`               | Node + `@nuxt/test-utils/e2e`                         | Fluxos completos no navegador (Playwright), SSR (`$fetch`, `setup`) e endpoints de API (`server/api/`)           |

## Regras de Criação de Arquivos

1. **Nomenclatura**:
   - Todos os arquivos de teste devem utilizar o sufixo **`.test.ts`** ou **`.spec.ts`** (ex.: `currency.test.ts`, `BaseButton.test.ts`, `auth-flow.e2e.test.ts`).
2. **Não Misture Ambientes no Mesmo Arquivo**:
   - Helpers de `@nuxt/test-utils/runtime` (como `mountSuspended`, `mockNuxtImport`, `registerEndpoint`) e helpers de `@nuxt/test-utils/e2e` (como `setup`, `$fetch`, `createPage`) **nunca** podem ser importados no mesmo arquivo de teste.
   - Coloque cada arquivo no subdiretório correspondente ao seu projeto do `vitest.config.ts`.
3. **Proibido Usar `// @vitest-environment`**:
   - Não utilize comentários `// @vitest-environment nuxt` no topo dos arquivos; deixe o `include` de cada projeto no `vitest.config.ts` determinar o ambiente para garantir que os plugins Vite do Nuxt sejam carregados corretamente.

## Boas Práticas

- **Pirâmide de Testes**: Priorize testes rápidos em `test/unit/` para lógica pura, use `test/nuxt/` para componentes e composables que dependem do Nuxt, e reserve `test/e2e/` para jornadas críticas de usuário e contratos de servidor.
- **Isolamento de Estado**: Cada teste (`it` / `test`) deve ser independente e limpar qualquer estado ou mock alterado ao final de sua execução.
