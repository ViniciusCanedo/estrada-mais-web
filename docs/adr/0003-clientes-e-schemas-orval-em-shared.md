# ADR 0003: Migração dos clientes HTTP e schemas do Orval para `shared/`

- **Data:** 2026-11-10
- **Status:** Aceito
- **Regras relacionadas:** §2 (Arquitetura e estrutura de dependências), §4.2 (TypeScript) e §12 (Emenda desta constituição) da [`.agents/CONSTITUTION.md`](../../.agents/CONSTITUTION.md)

## Contexto

Na versão 1.1.0 da Constituição, os clientes HTTP e schemas gerados pelo Orval a partir da especificação OpenAPI ficavam em `app/http/`, com o _mutator_ `customFetch` em `app/lib/client.ts`.

No entanto, no Nuxt 4, os contratos (`api.schemas.ts`) e clientes HTTP gerados pelo Orval podem ser consumidos tanto pela camada cliente/SSR (`app/`) quanto pela camada de servidor Nitro (`server/`). Como a regra arquitetural `server-not-to-app` proíbe `server/` de importar qualquer módulo de `app/`, manter os artefatos do Orval em `app/http/` impedia seu reuso legítimo no backend sem violar o isolamento de camadas.

## Decisões Arquiteturais

1. **Migração dos artefatos gerados para `shared/http/`:**
   - O `target` do `orval.config.ts` passa a gerar os clientes e schemas em `shared/http/` (`shared/http/api.schemas.ts`, `shared/http/index.ts` e subpastas por tag).
   - O consumo tanto em `app/` quanto em `server/` padroniza-se pelo alias nativo do Nuxt 4 `#shared/http/...`.

2. **Migração do _mutator_ para `shared/lib/client.ts`:**
   - Para respeitar a regra `shared-is-pure` (`shared/**` não pode importar `app/**` nem `server/**`), o _mutator_ `customFetch` também foi movido para `shared/lib/client.ts`.
   - O `resolveSsrHeaders` resolve `useRequestHeaders` de forma segura e desacoplada via `globalThis` quando em contexto SSR, mantendo compatibilidade estrita com `.nuxt/tsconfig.shared.json`, `app/`, `server/` e testes unitários em Node.

3. **Preservação da restrição `components-no-direct-io`:**
   - A regra `components-no-direct-io` no `.dependency-cruiser.cjs` foi atualizada para impedir que componentes visuais (`app/components/**`) importem diretamente `shared/http/**` ou `shared/lib/**`, exigindo que o acesso ocorra via composables ou stores.

## Consequências

- **Positivas:** Compartilhamento isomórfico seguro de clientes HTTP e schemas OpenAPI entre `app/` e `server/` sem violar fronteiras de camadas (`dependency-cruiser`) nem os contextos de compilação TypeScript (`tsconfig.app.json`, `tsconfig.server.json` e `tsconfig.shared.json`).
- **Governança:** Constituição atualizada para a versão `1.2.0` e _quality gates_ (`eslint`, `jscpd`, `knip`, `vitest` e `dependency-cruiser`) sincronizados com o novo caminho `shared/http/`.
