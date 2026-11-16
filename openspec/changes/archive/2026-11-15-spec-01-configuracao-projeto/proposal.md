## Why

O repositório Estrada+ parte de um scaffolding Nuxt 4 acoplado ao Orval (`openapi.json` e `shared/http/`) e ainda não possui camada de persistência SQLite/Drizzle ORM, envio de e-mails SMTP, regras arquiteturais protegendo acesso a dados nem workflow de CI/CD. Antes de iniciar o desenvolvimento das funcionalidades de design system, autenticação e domínio, é necessário consolidar a fundação do projeto, atualizar a constituição para v2.0.0 e endurecer os _quality gates_ para evitar duplicação de contratos e desvios de camada.

## What Changes

- **BREAKING** Atualizar `.agents/CONSTITUTION.md` para a versão `2.0.0` (removendo referências a Orval/OpenAPI manual e formalizando as camadas `api -> services -> repositories -> database`, Zod em `shared/schemas/` e idioma `pt-BR`), registrando a decisão em `docs/adr/0004-arquitetura-drizzle-sqlite-e-remocao-orval.md`.
- **BREAKING** Desinstalar `orval` e remover resíduos do template (`openapi.json`, `orval.config.ts`, `shared/http/`, `shared/lib/client.ts`, `shared/utils/health-schema.ts`, `app/stores/counter.ts`, `test/unit/counter.spec.ts`, `content/`, `layers/`, `modules/`).
- Instalar `drizzle-orm`, `better-sqlite3` e `nodemailer` em `dependencies` com versões fixas (`--save-exact`) e `drizzle-kit`, `drizzle-seed`, `@types/better-sqlite3`, `@types/nodemailer` e `tsx` em `devDependencies`, além de configurar os scripts `db:generate`, `db:migrate`, `db:seed` e `db:studio`.
- Estruturar a persistência SQLite (`drizzle.config.ts`, `server/database/schema.ts` com `drivers`, `password_reset_tokens`, `trips` e `expenses`, `server/database/client.ts` em modo WAL com `foreign_keys = ON`, `server/database/migrate.ts`, migration inicial SQL, plugin Nitro `server/plugins/01.database-migrate.ts` e `server/database/seed.ts` com `drizzle-seed` e factories de teste).
- Implementar utilitários de servidor (`server/utils/password.ts` com `scrypt`/`SHA-256` e `server/utils/mailer.ts` com `nodemailer`), schemas compartilhados (`shared/schemas/common.schema.ts` e `shared/schemas/health.schema.ts`) e atualizar o fluxo `/api/health` em 3 camadas (`server/api/health.get.ts` -> `server/services/health.service.ts` -> `server/repositories/health.repository.ts`) e `app/pages/index.vue`.
- Atualizar `nuxt.config.ts` (`runtimeConfig`), `README.md`, `.env.example`, `.gitignore`, `.dockerignore`, `docker/prod/Dockerfile`, `docker-compose.prod.yml`, `.github/workflows/quality.yml` e `test/load/load.js`.
- Endurecer os _quality gates_ em `.dependency-cruiser.cjs`, `eslint.config.mjs`, `knip.json`, `.jscpd.json`, `vitest.config.ts` (adicionando `server/repositories/**` nos thresholds de 90%), `test/arch/layers.spec.ts` e `test/arch/docker.spec.ts`, além de ampliar testes unitários, Nuxt e E2E.

## Capabilities

### New Capabilities

- `project-foundation`: Fundação do projeto Estrada+ abrangendo constituição v2.0.0, remoção do Orval e resíduos de template, persistência Drizzle ORM + SQLite (`better-sqlite3`), utilitários criptográficos/SMTP, healthcheck em camadas, infraestrutura Docker/CI e validação estrita de fronteiras arquiteturais e schemas Zod.

### Modified Capabilities

<!-- Nenhuma capacidade existente em openspec/specs/ tem seus requisitos alterados; architecture-foundation permanece preservada -->

## Non-Goals

- Implementação das telas completas Night Highway, layouts `default`/`auth`/`print` e componentes visuais de design system (escopo de `02-design-system-e-layout`).
- Implementação dos endpoints e fluxos completos de login, recuperação de senha, perfil/configurações, CRUD de viagens, CRUD de despesas e relatórios (escopo de `03` a `07`).
- Adição do utilitário `scripts/backup-sqlite.mjs` e `server/utils/logger.ts` completo de produção (escopo de `08-deploy`).

## Impact

- Governança e documentação: `.agents/CONSTITUTION.md`, `docs/adr/0004-arquitetura-drizzle-sqlite-e-remocao-orval.md`, `README.md`, `.env.example`, `.gitignore`.
- Dependências e configuração: `package.json`, `package-lock.json`, `nuxt.config.ts`, `drizzle.config.ts`, `.dependency-cruiser.cjs`, `eslint.config.mjs`, `knip.json`, `.jscpd.json`, `vitest.config.ts`.
- Código de aplicação e servidor: `app/pages/index.vue`, `shared/schemas/*.schema.ts`, `server/database/**`, `server/plugins/01.database-migrate.ts`, `server/repositories/health.repository.ts`, `server/services/health.service.ts`, `server/api/health.get.ts`, `server/utils/password.ts`, `server/utils/mailer.ts`.
- Infraestrutura, CI e testes: `docker/prod/Dockerfile`, `docker-compose.prod.yml`, `.dockerignore`, `.github/workflows/quality.yml`, `test/arch/*.spec.ts`, `test/unit/*.spec.ts`, `test/nuxt/index.spec.ts`, `test/e2e/home.spec.ts`, `test/load/load.js`.
