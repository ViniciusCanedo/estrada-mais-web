# project-foundation Specification

## Purpose

Definir a fundação de configuração, persistência e governança do Estrada+, cobrindo a Constituição v2.0.0, remoção do Orval e resíduos do template, camada Drizzle ORM + SQLite (`better-sqlite3`), utilitários de senha e SMTP, healthcheck em 3 camadas, infraestrutura Docker/CI e validação estrita de fronteiras arquiteturais e schemas Zod.

## Requirements

### Requirement: Constituição v2.0.0, remoção do Orval e limpeza do template

O repositório SHALL atualizar `.agents/CONSTITUTION.md` para a versão `2.0.0` (removendo referências a Orval, OpenAPI manual e `shared/http/`, e formalizando a arquitetura `server/api` → `server/services` → `server/repositories` → `server/database`, schemas Zod em `shared/schemas/` e idioma `pt-BR`), registrar a decisão em `docs/adr/0004-arquitetura-drizzle-sqlite-e-remocao-orval.md`, remover `orval` do `package.json`, excluir `openapi.json`, `orval.config.ts`, `shared/http/`, `shared/lib/client.ts`, `shared/utils/health-schema.ts`, `app/stores/counter.ts`, `test/unit/counter.spec.ts`, `content/`, `layers/` e `modules/`, e atualizar `README.md` e `.env.example`.

#### Scenario: Remoção completa do fluxo Orval e código de exemplo do template

- **WHEN** o repositório é inspecionado após a configuração inicial
- **THEN** `orval` não consta em `package.json`, não existe o script `api:generate`, os artefatos `openapi.json`, `orval.config.ts`, `shared/http/`, `shared/lib/client.ts`, `app/stores/counter.ts`, `test/unit/counter.spec.ts`, `content/`, `layers/` e `modules/` não existem mais, e `app/pages/index.vue` consome `/api/health` sem `useCounterStore` ou `#shared/http`

#### Scenario: Governança e documentação sincronizadas com a arquitetura v2.0.0

- **WHEN** `.agents/CONSTITUTION.md`, `README.md`, `.env.example` e `docs/adr/0004-arquitetura-drizzle-sqlite-e-remocao-orval.md` são consultados
- **THEN** todos refletem a stack Drizzle ORM + SQLite (`better-sqlite3`), Zod 4 em `shared/schemas/` e os comandos `db:generate`, `db:migrate`, `db:seed` e `db:studio`

### Requirement: Persistência Drizzle ORM, SQLite WAL, migrations e seed determinístico

O sistema SHALL fornecer `drizzle.config.ts`, `server/database/schema.ts` (definindo as tabelas portáveis `drivers`, `password_reset_tokens`, `trips` e `expenses` com valores monetários em centavos inteiros, litragens em decilitros inteiros, pesos em kg inteiros, metas de consumo em milésimos de km/L inteiros e datas ISO-8601 `text`, reutilizando `EXPENSE_CATEGORIES` e `PAYMENT_METHODS` de `shared/types/domain.ts`), `server/database/client.ts` (com `createDatabaseClient` e singleton `getDatabase` configurando `PRAGMA journal_mode = WAL` para bancos em arquivo, `PRAGMA synchronous = NORMAL`, `PRAGMA foreign_keys = ON` e `PRAGMA busy_timeout = 5000`), `server/database/migrate.ts`, migration SQL gerada via `drizzle-kit generate`, plugin Nitro `server/plugins/01.database-migrate.ts` executando migrations no boot sem importar `drizzle-seed`, e `server/database/seed.ts` idempotente utilizando `drizzle-seed` além de factories de teste (`createTestDriver`, `createTestResetToken`, `createTestTrip`, `createTestExpense`).

#### Scenario: Conexão SQLite e aplicação automática de migrations em memória e arquivo

- **WHEN** `createDatabaseClient(':memory:')` ou `createDatabaseClient(filePath)` é inicializado e `runMigrations(db)` é executado
- **THEN** o diretório pai de arquivos em disco é criado recursivamente, os pragmas `foreign_keys = ON` e `busy_timeout = 5000` (e `journal_mode = WAL` em arquivo) são ativados, e as 4 tabelas (`drivers`, `password_reset_tokens`, `trips`, `expenses`) com suas constraints `CHECK` e índices são criadas

#### Scenario: Seed idempotente do motorista padrão e histórico de Abr–Set/2026

- **WHEN** `seedDatabase(db)` é executado duas vezes consecutivas sobre o mesmo banco migrado
- **THEN** o motorista padrão `Valdir Silveira` (`valdir.silveira.truck@estrada.com.br`), as viagens de Abr–Set/2026 e as despesas correspondentes são inseridos na primeira execução e preservados sem duplicação na segunda

### Requirement: Utilitários criptográficos de senha/token e cliente SMTP

O servidor SHALL fornecer `server/utils/password.ts` (exportando `hashPassword` usando `scrypt` com salt aleatório de 16 bytes, `verifyPassword` com `timingSafeEqual` e `hashTokenSha256` via `node:crypto`) e `server/utils/mailer.ts` (exportando `sendPasswordResetEmail` com `nodemailer` lendo `useRuntimeConfig().smtp`, entrando em modo simulado seguro quando `smtp.host` estiver vazio).

#### Scenario: Hash e verificação segura de senha e token SHA-256

- **WHEN** `hashPassword` gera o hash `scrypt$<salt>$<key>` para uma senha e `verifyPassword` compara senha correta, incorreta ou hash malformado
- **THEN** apenas a senha correta retorna `true`, falhas retornam `false` sem lançar exceção, e `hashTokenSha256` retorna digest hexadecimal determinístico de 64 caracteres diferente do token bruto

#### Scenario: Envio de e-mail de redefinição ou modo simulado sem host SMTP

- **WHEN** `sendPasswordResetEmail` é chamado com `smtp.host` configurado vs. vazio
- **THEN** com host configurado utiliza `nodemailer.createTransport` com as credenciais de `runtimeConfig.smtp`; com host vazio conclui sem erro de rede sem expor credenciais ou tokens em `console.log`

### Requirement: Schemas Zod compartilhados e endpoint `/api/health` em 3 camadas

O sistema SHALL definir `shared/schemas/common.schema.ts` (`competenceMonthSchema`, `competenceQuerySchema`) e `shared/schemas/health.schema.ts` (`healthResponseSchema`, `HealthStatusPayload`), e implementar o fluxo `/api/health` exclusivamente através de `server/api/health.get.ts` (validando query com `getValidatedQuery` e tratando erros via `handleServiceError`) → `server/services/health.service.ts` (lançando `DomainError('SERVICE_UNAVAILABLE', 'Banco de dados indisponível.')` em falha) → `server/repositories/health.repository.ts` (executando `SELECT 1 AS ok` e consultas opcionais de contagem no SQLite).

#### Scenario: Healthcheck com banco conectado e query de competência válida

- **WHEN** `GET /api/health?month=2026-09` é requisitado com SQLite operacional
- **THEN** retorna HTTP `200` com `{ status: 'ok', database: 'connected', timestamp }` aderente a `healthResponseSchema`

#### Scenario: Healthcheck falha com HTTP 503 quando o banco está indisponível

- **WHEN** `healthRepository.pingDatabase()` retorna `false` ou lança erro de banco
- **THEN** `healthService.getHealthStatus` lança `DomainError('SERVICE_UNAVAILABLE', 'Banco de dados indisponível.')` e o endpoint retorna HTTP `503` sem vazar detalhes internos

### Requirement: Endurecimento de fronteiras arquiteturais, Docker e CI/CD

Os _quality gates_ SHALL impor o isolamento estrito entre camadas via `.dependency-cruiser.cjs` (`api-via-services`, `only-repos-access-drizzle`, `services-not-to-api`, `repos-not-to-services`, `shared-is-pure`, `components-no-direct-io`, `no-dev-deps-in-prod`), proibir declaração de `z.object(` fora de `shared/schemas/` e chamadas `process.env` fora dos arquivos permitidos via ESLint e `test/arch/layers.spec.ts`, exigir validação Zod com `#shared/schemas/` em handlers `POST`/`PUT`/`PATCH` em `server/api/**`, incluir `server/repositories/**` com threshold mínimo de `90%` em `vitest.config.ts`, configurar Docker multi-stage com diretório `/app/data`, migrations e volume persistente validados por `test/arch/docker.spec.ts`, e disponibilizar `.github/workflows/quality.yml` e `test/load/load.js`.

#### Scenario: Detecção automática de violações arquiteturais e contratos Zod

- **WHEN** `npm run deps:check`, `npm run lint` e `npm run test:arch` são executados
- **THEN** validam que apenas `server/repositories/**` (e `server/database/**` / plugin de migration) acessam Drizzle/`better-sqlite3`, que `z.object(` não ocorre fora de `shared/schemas/`, que handlers de mutação em `server/api/**` importam de `#shared/schemas/` e validam entrada, e que `docker/prod/Dockerfile` e `docker-compose.prod.yml` atendem às exigências do SQLite em produção

#### Scenario: Cobertura mínima de 90% em serviços, repositórios e código compartilhado

- **WHEN** `npm run test:coverage` é executado
- **THEN** todos os testes unitários e Nuxt passam com cobertura >= 90% em `server/services/**`, `server/repositories/**` e `shared/**` e cobertura global >= 80% (75% branches)
