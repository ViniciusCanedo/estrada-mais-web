# ADR 0004: Arquitetura Drizzle ORM + SQLite, Schemas Zod em `shared/schemas/` e Remoção do Orval

- **Data:** 2026-11-15
- **Status:** Aceito
- **Regras relacionadas:** §1 (Princípios), §2 (Arquitetura e dependências), §4.2 (TypeScript), §7 (Dependências) e §12 (Emenda desta constituição) da [`.agents/CONSTITUTION.md`](../../.agents/CONSTITUTION.md)

## Contexto

Na versão `1.2.0` da Constituição (e no ADR 0003), o template original assumia uma API externa descrita em `openapi.json`, gerando clientes HTTP e DTOs em `shared/http/` via `orval`. Entretanto, o **Estrada+** é uma aplicação full-stack Nuxt 4 cuja API vive integralmente em `server/api/**` dentro do mesmo repositório.

Manter o `orval` nesse cenário exigiria duplicar manualmente contratos em `openapi.json` (violando o princípio DRY) e ainda não fornecia camada de persistência nem validação compartilhada com formulários `@nuxt/ui` (`UForm`).

## Decisões Arquiteturais

1. **Remoção do Orval e adoção de contratos Zod isomórficos em `shared/schemas/`:**
   - O pacote `orval` e os artefatos `openapi.json`, `orval.config.ts`, `shared/http/`, `shared/lib/client.ts` e o script `api:generate` são removidos.
   - Schemas Zod passam a ser a fonte única de verdade em `shared/schemas/*.schema.ts`, reutilizados tanto nos handlers Nitro (`readValidatedBody`, `getValidatedQuery`, `getValidatedRouterParams`) quanto no front-end (`UForm`, `useApiFetch` e `$fetch`).
   - ESLint (`no-restricted-syntax`) e `test/arch/layers.spec.ts` proíbem declarações `z.object(` fora de `shared/schemas/`.

2. **Persistência com Drizzle ORM + `better-sqlite3` (SQLite WAL) em 3 camadas estritas:**
   - Adicionadas em `dependencies` com versões fixas (`--save-exact`): `drizzle-orm` (Apache-2.0), `better-sqlite3` (MIT) e `nodemailer` (MIT-0/MIT), além de `drizzle-kit`, `drizzle-seed`, `@types/better-sqlite3`, `@types/nodemailer` e `tsx` em `devDependencies`.
   - Conexão em `server/database/client.ts` configura `PRAGMA journal_mode = WAL`, `PRAGMA synchronous = NORMAL`, `PRAGMA foreign_keys = ON` e `PRAGMA busy_timeout = 5000`, com execução automática de migrations no boot em `server/plugins/01.database-migrate.ts`.
   - O schema em `server/database/schema.ts` armazena valores monetários em centavos (`integer`), volumes em decilitros (`integer`), pesos em kg (`integer`), metas em milésimos de km/L (`integer`) e datas em ISO-8601 (`text`) para portabilidade futura (ex.: PostgreSQL).
   - Imposição de fluxo unidirecional `server/api/**` → `server/services/**` → `server/repositories/**` → `server/database/**` via regras `.dependency-cruiser.cjs` (`api-via-services`, `only-repos-access-drizzle`, `services-not-to-api`, `repos-not-to-services`) e cobertura ≥ 90% também exigida para `server/repositories/**` no `vitest.config.ts`.

3. **Isolamento de `drizzle-seed` fora do bundle de produção:**
   - `drizzle-seed` é mantido exclusivamente em `devDependencies` e importado apenas por `server/database/seed.ts` (CLI `npm run db:seed` e factories de teste), com exceção restrita na regra `no-dev-deps-in-prod`.

4. **Atualização da Constituição para v2.0.0, Docker e CI/CD:**
   - `.agents/CONSTITUTION.md` atualizada para `2.0.0`, `docker/prod/Dockerfile` e `docker-compose.prod.yml` adaptados para volume persistente `/app/data`, migrations e módulo nativo `better-sqlite3`, e pipeline completo adicionado em `.github/workflows/quality.yml`.

## Consequências

- **Positivas:** Fonte única de verdade para validação e tipos via Zod 4, persistência local durável com suporte nativo a testes em SQLite `:memory:`, redução de boilerplate e imposição automatizada das fronteiras entre HTTP, domínio e dados.
- **Atenção operacional:** Containers Docker devem rodar com réplica única por volume SQLite e preservar `/app/data` em volume nomeado (`estrada_sqlite_data`).
