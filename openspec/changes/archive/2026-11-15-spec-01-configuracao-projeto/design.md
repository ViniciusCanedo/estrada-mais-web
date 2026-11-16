## Context

A branch `feat/00-overview` estabeleceu os tipos transversais (`shared/types/domain.ts`), conversores escalados (`shared/utils/units.ts`), o mapeamento centralizado de erros (`server/utils/domain-error.ts`) e a governança inicial OpenSpec. Contudo, o repositório ainda herda do scaffolding original o fluxo baseado em `orval` + `openapi.json` + `shared/http/` + `shared/lib/client.ts`, resíduos de exemplo (`counter` store, `content/`, `layers/`, `modules/`), `.agents/CONSTITUTION.md` na versão `1.2.0` e ausência completa da camada de banco de dados (`drizzle-orm`, `better-sqlite3`), utilitários de senha/SMTP e workflow de CI.

Restrições normativas (`.agents/CONSTITUTION.md` e `AGENTS.md`):

- Nenhum limite, regra de lint, threshold de cobertura ou ignore list pode ser afrouxado.
- `dependencies` em `package.json` exigem versões exatas (`--save-exact`).
- Código em `shared/**` deve permanecer 100% puro (zero dependências de `app/`, `server/`, Vue, Nuxt, Nitro, Node ou Drizzle).
- `server/repositories/**` é o único ponto de acesso ao Drizzle ORM e `better-sqlite3` em runtime de negócio; `server/services/**` concentram regras de negócio e `server/api/**` apenas validam entradas com `#shared/schemas/` e delegam para um service.
- `npm run quality` (gates G1–G13) deve passar integralmente com exit code `0`.

## Goals / Non-Goals

**Goals:**

- Atualizar `.agents/CONSTITUTION.md` para `2.0.0`, registrar o `ADR 0004` e atualizar `README.md`, `.env.example`, `.gitignore` e `.dockerignore`.
- Desinstalar `orval`, remover artefatos obsoletos e instalar `drizzle-orm`, `better-sqlite3`, `nodemailer` (exatos) + `drizzle-kit`, `drizzle-seed`, `@types/better-sqlite3`, `@types/nodemailer` e `tsx` (dev).
- Criar `drizzle.config.ts`, `server/database/schema.ts` (4 tabelas completas e portáveis), `server/database/client.ts` (singleton WAL/FK + `createDatabaseClient`), `server/database/migrate.ts`, migration inicial SQL, `server/plugins/01.database-migrate.ts` e `server/database/seed.ts` (seed idempotente + factories).
- Criar `server/utils/password.ts` e `server/utils/mailer.ts`.
- Criar `shared/schemas/common.schema.ts` e `shared/schemas/health.schema.ts`, refatorar `/api/health` em 3 camadas (`health.get.ts` -> `health.service.ts` -> `health.repository.ts`) e atualizar `app/pages/index.vue` e `nuxt.config.ts`.
- Atualizar `docker/prod/Dockerfile`, `docker-compose.prod.yml`, `.github/workflows/quality.yml` e `test/load/load.js`.
- Endurecer `.dependency-cruiser.cjs`, `eslint.config.mjs`, `knip.json`, `.jscpd.json`, `vitest.config.ts`, `test/arch/layers.spec.ts` e `test/arch/docker.spec.ts`, e cobrir os novos módulos com testes unitários, Nuxt e E2E (`>= 90%` em services, repositories e shared).

**Non-Goals:**

- Implementar o tema Night Highway completo, layout shell (`AppSidebar`, `AppTopBar`) ou telas de domínio (`02` a `07`).
- Implementar `scripts/backup-sqlite.mjs` ou middleware de logging completo (`08-deploy`).

## Decisions

### 1. Injeção opcional de instância de banco (`BetterSQLite3Database`) nos Repositories e Helpers

- **Decisão:** `createDatabaseClient(dbPath)` retorna uma instância isolada Drizzle + `better-sqlite3` configurada com os pragmas necessários (`foreign_keys = ON`, `busy_timeout = 5000`, e `journal_mode = WAL` + `synchronous = NORMAL` quando `dbPath !== ':memory:'`), enquanto `getDatabase()` gerencia o singleton usando `useRuntimeConfig().databaseUrl` (com fallback seguro quando executado fora do Nitro). Os métodos/classes de `HealthRepository`, `runMigrations` e `seedDatabase` aceitam opcionalmente uma instância de banco injetada.
- **Motivação:** Permite que os testes unitários e de repositório em Vitest (`environment: 'node'`) executem contra um SQLite `:memory:` real com migrations aplicadas e sem depender do runtime Nitro ou de arquivos em disco, preservando o singleton em produção.
- **Alternativas consideradas:** Usar sempre singleton global dependente de `useRuntimeConfig()` (descartado porque acoplaria testes unitários ao contexto Nitro e impediria isolamento entre testes paralelos).

### 2. Isolamento estrito de `drizzle-seed` fora do código de produção

- **Decisão:** `drizzle-seed` reside em `devDependencies` e é importado exclusivamente por `server/database/seed.ts`. O plugin de boot `server/plugins/01.database-migrate.ts` importa apenas `server/database/migrate.ts` e `server/database/client.ts` (nunca `seed.ts`). No `.dependency-cruiser.cjs`, a regra `no-dev-deps-in-prod` permite exceção explícita apenas para `server/database/seed.ts`.
- **Motivação:** Em produção (`docker/prod/Dockerfile`), `devDependencies` não são instaladas/empacotadas, e a Constituição proíbe que código de produção importe `devDependencies`. Manter `seed.ts` isolado para CLI (`npm run db:seed`) e factories de teste preserva o bundle de produção limpo e o gate `deps:check` estrito.
- **Alternativas consideradas:** Mover `drizzle-seed` para `dependencies` (descartado para não inflar produção com dependência exclusiva de dev/test conforme spec `01` §3.1).

### 3. Regra `no-restricted-syntax` para `z.object` e exceção controlada de `process.env` no ESLint

- **Decisão:** Em `eslint.config.mjs`:
  - Adicionar regra `no-restricted-syntax` específica para `app/**/*.{ts,vue}` e `server/**/*.ts` proibindo `CallExpression[callee.object.name='z'][callee.property.name='object']` fora de `shared/schemas/**`.
  - Manter a proibição de `process.env` globalmente, liberando apenas nos arquivos de infraestrutura previstos pela Constituição v2.0.0 (`nuxt.config.ts`, `drizzle.config.ts`, `playwright.config.ts`, `scripts/**/*.mjs`, `server/database/migrate.ts`, `server/database/seed.ts`).
- **Motivação:** Impede duplicação de schemas Zod em componentes ou rotas de API (regra 4 da spec `01` §7.3) e garante que scripts CLI de banco (`drizzle.config.ts`, `migrate.ts`, `seed.ts`) funcionem fora do Nitro sem violar o ESLint. Nota: `server/database/client.ts` lê `useRuntimeConfig()` dentro de `try/catch` (sem `process.env`) e recebe `dbPath` explícito em CLI/testes, mantendo conformidade estrita com `no-process-env` no código de runtime Nitro.

### 4. Compatibilidade nativa de `better-sqlite3` no Nitro e no Node 26 / Docker

- **Decisão:** Registrar `better-sqlite3` em `allowScripts` no `package.json` se necessário durante o `npm install`, configurar `nitro.externals.inline` / `rollupConfig.external` apenas se o build exigir (ou `nitro: { moduleSideEffects: ... }` conforme comportamento real do `nuxt build` com Node 26), e validar no `node -e` e no `npm run build` que `.output/server` resolve `better-sqlite3` corretamente.
- **Motivação:** Addons nativos C++ (`.node`) frequentemente falham quando bundled pelo Rollup se não forem externalizados corretamente pelo Nitro.

### 5. Consolidação de testes e remoção de resquícios Orval em `test/`

- **Decisão:** Remover `test/unit/counter.spec.ts` e adaptar `test/nuxt/index.spec.ts` e `test/e2e/home.spec.ts` para o novo `app/pages/index.vue` (que exibe o estado inicial do Estrada+ consumindo `/api/health` via `useApiFetch<HealthStatusPayload>` e `$fetch`), além de adicionar testes unitários completos para `health.service.ts`, `health.repository.ts`, `database` (`client`, `migrate`, `seed`), `password.ts` e `mailer.ts`.
- **Motivação:** Garante que os testes refletem o código real sem depender de `useCounterStore` ou `#shared/http`, alcançando `>= 90%` em `server/services/**`, `server/repositories/**` e `shared/**`.

## Risks / Trade-offs

- **Risco:** Compilação de `better-sqlite3` no Node `v26.3.0` local (pode não haver prebuild publicado ainda para ABI v141, exigindo compilação C++ local via Xcode Command Line Tools ou `allowScripts`). → **Mitigação:** Testar imediatamente após `npm install` com `node -e "import('better-sqlite3')..."` e verificar se `allowScripts` precisa incluir `"better-sqlite3@<versao>": true`.
- **Risco:** `secretlint` acusar falsos positivos na senha padrão de desenvolvimento em `server/database/seed.ts` ou testes (`password.spec.ts`, `mailer.spec.ts`), ou em `.github/workflows/quality.yml`. → **Mitigação:** Construir strings de senha de teste/seed de forma segura ou verificar imediatamente com `npm run secrets:check` sem adicionar exceções indevidas.
- **Risco:** `eslint-plugin-better-tailwindcss` ou `vuejs-accessibility` apontar erros no novo `app/pages/index.vue` ou `knip` acusar exports não usados em `server/utils/password.ts`, `server/utils/mailer.ts` ou `server/database/seed.ts` antes dos módulos `03`–`07`. → **Mitigação:** Incluir os arquivos em `knip.json` `entry` (já cobre `server/**/*.ts` e `shared/**/*.ts`, mas atenção a exports não consumidos em arquivos importados por testes — `knip` checa exports não importados se o arquivo está no graph! Vamos validar `npm run unused:check` explicitamente!).
- **Risco:** `.gitignore` manter `.worktrees` / `.worktrees/**` durante a atualização da Seção 5.3 da spec `01`. → **Mitigação:** Preservar as entradas `.worktrees` e `.worktrees/**` no `.gitignore` (já aprovadas na `spec-00-overview`) ao aplicar o conteúdo proposto pela spec `01` §5.3, garantindo isolamento contínuo das worktrees.
