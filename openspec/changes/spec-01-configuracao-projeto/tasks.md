## 1. Dependências e Scripts (`package.json` & `package-lock.json`)

- [x] 1.1 Desinstalar `orval` (`npm uninstall orval`) e remover o script `"api:generate"` de `package.json`
- [x] 1.2 Instalar `drizzle-orm`, `better-sqlite3` e `nodemailer` com `--save-exact`, e `drizzle-kit`, `drizzle-seed`, `@types/better-sqlite3`, `@types/nodemailer` e `tsx` com `--save-dev`, atualizando `allowScripts` se necessário
- [x] 1.3 Validar o carregamento do addon nativo `better-sqlite3` em Node (`SELECT 1 as ok` em `:memory:`) e adicionar os scripts `db:generate`, `db:migrate`, `db:seed` e `db:studio` no `package.json`

## 2. Limpeza de Resíduos do Template e Orval

- [x] 2.1 Remover `openapi.json`, `orval.config.ts`, `shared/http/`, `shared/lib/client.ts`, `shared/utils/health-schema.ts`, `app/stores/counter.ts`, `test/unit/counter.spec.ts`, `content/`, `layers/` e `modules/`
- [x] 2.2 Atualizar `app/pages/index.vue` removendo `useCounterStore` e `#shared/http`, consumindo `/health` via `useApiFetch<HealthStatusPayload>` e `$fetch('/api/health')` com `#shared/schemas/health.schema`

## 3. Schema Drizzle, Conexão SQLite, Migrations, Seed e Utilitários de Servidor

- [x] 3.1 Criar `drizzle.config.ts` (`dialect: 'sqlite'`, `schema: './server/database/schema.ts'`, `out: './server/database/migrations'`) e `server/database/schema.ts` definindo as tabelas `drivers`, `password_reset_tokens`, `trips` e `expenses` com tipos inferidos
- [x] 3.2 Criar `server/database/client.ts` com `createDatabaseClient(dbPath)` e `getDatabase()` configurando `WAL` (quando em arquivo), `synchronous = NORMAL`, `foreign_keys = ON`, `busy_timeout = 5000` e criação recursiva do diretório pai
- [x] 3.3 Criar `server/database/migrate.ts`, gerar a migration inicial SQL via `npm run db:generate` em `server/database/migrations/` e criar `server/plugins/01.database-migrate.ts` sem importar `drizzle-seed`
- [x] 3.4 Criar `server/utils/password.ts` (`hashPassword`, `verifyPassword`, `hashTokenSha256`) e `server/utils/mailer.ts` (`sendPasswordResetEmail` com `nodemailer` e fallback seguro sem host SMTP)
- [x] 3.5 Criar `server/database/seed.ts` com `seedDatabase(database)` idempotente usando `drizzle-seed` (Valdir Silveira + histórico Abr–Set/2026) e factories de teste (`createTestDriver`, `createTestResetToken`, `createTestTrip`, `createTestExpense`)

## 4. Schemas Zod, Camadas do `/api/health` e `nuxt.config.ts`

- [x] 4.1 Criar `shared/schemas/common.schema.ts` (`competenceMonthSchema`, `competenceQuerySchema`) e `shared/schemas/health.schema.ts` (`healthResponseSchema`, `HealthStatusPayload`)
- [x] 4.2 Implementar `server/repositories/health.repository.ts`, `server/services/health.service.ts` e atualizar `server/api/health.get.ts` validando query com `getValidatedQuery` e tratando erros com `handleServiceError`
- [x] 4.3 Atualizar `nuxt.config.ts` com `runtimeConfig` (`appSecret`, `databaseUrl`, `smtp`, `public: { apiBase, appUrl }`) e configuração `nitro` compatível com `better-sqlite3`

## 5. Governança, Constituição v2.0.0, Docker, CI e Quality Gates

- [x] 5.1 Atualizar `.agents/CONSTITUTION.md` para `2.0.0` e criar `docs/adr/0004-arquitetura-drizzle-sqlite-e-remocao-orval.md`
- [x] 5.2 Atualizar `README.md`, `.env.example`, `.gitignore`, `.dockerignore`, `docker/prod/Dockerfile` e `docker-compose.prod.yml`
- [x] 5.3 Criar `.github/workflows/quality.yml` e `test/load/load.js`
- [x] 5.4 Atualizar `.dependency-cruiser.cjs`, `eslint.config.mjs`, `knip.json`, `.jscpd.json`, `vitest.config.ts`, `test/arch/layers.spec.ts` e `test/arch/docker.spec.ts` impondo isolamento Drizzle/Zod, validação Zod em endpoints e cobertura ≥ 90% em `server/repositories/**`

## 6. Testes Automatizados e Validação Final

- [x] 6.1 Criar/atualizar `test/unit/health.service.spec.ts`, `test/unit/health.repository.spec.ts`, `test/unit/database.spec.ts`, `test/unit/password.spec.ts` e `test/unit/mailer.spec.ts` em `pt-BR`
- [x] 6.2 Atualizar `test/nuxt/index.spec.ts` e `test/e2e/home.spec.ts` alinhados à nova página inicial e endpoint `/api/health`
- [x] 6.3 Executar `npm run quality` garantindo exit code `0` em todos os gates G1–G13 e cobertura ≥ 90% em `server/services/**`, `server/repositories/**` e `shared/**`
