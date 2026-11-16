## Why

A operação do Estrada+ em ambiente de produção exige garantias formais de durabilidade do banco SQLite em modo WAL, backups online atômicos com política de retenção automatizada, observabilidade via logs JSON estruturados isentos de segredos ou dados pessoais (LGPD / §8 da Constituição) e validação contínua da imagem Docker multi-stage e do healthcheck no pipeline de CI/CD. Sem essas rotinas padronizadas e verificadas por testes, atualizações de versão ou falhas operacionais poderiam comprometer dados financeiros e telemétricos do motorista autônomo ou expor informações sensíveis em logs de servidor.

## What Changes

- **Observabilidade e Logs Estruturados (`server/utils/logger.ts`):**
  - Implementa utilitário centralizado de logging em JSON para `stdout` (`info`, `warn`) e `stderr` (`error`), em conformidade com a proibição de `console.log` (`no-console: error`).
  - Aplica sanitização e redaction recursiva de credenciais (`password`, `currentPassword`, `newPassword`, `passwordHash`, `token`, `tokenHash`, `cookie`, `authorization`, `secret`) e mascaramento de endereços de e-mail (`[REDACTED_EMAIL]`).
  - Integra o logger estruturado ao boot de migrations (`server/plugins/01.database-migrate.ts`) e ao disparo de e-mails transacionais (`server/utils/mailer.ts`).
- **Backup Online Consistente do SQLite e Retenção (`server/database/client.ts`, `server/utils/backup-retention.ts`, `scripts/backup-sqlite.mjs`):**
  - Implementa rotina de backup atômico utilizando a API nativa `.backup(destinationPath)` do `better-sqlite3`, segura para bancos ativos em modo WAL.
  - Implementa política de nomenclatura de snapshots (`pre-deploy-YYYYMMDD-HHMMSS.db` / `backup-YYYY-MM-DD.db`) e poda automática mantendo exatamente os 14 snapshots mais recentes no diretório de backups.
  - Disponibiliza o comando CLI `npm run db:backup` (`node scripts/backup-sqlite.mjs`) e documenta a operação em produção e rollback no `README.md`.
- **Contratos Arquiteturais de Deploy e CI/CD (`test/arch/docker.spec.ts`):**
  - Expande a suíte arquitetural para validar o pipeline `.github/workflows/quality.yml` (jobs `quality` e `docker-verify`, execução de `db:migrate`, `db:seed`, `npm run quality` e probe HTTP em `/api/health`), além da presença e configuração de `scripts/backup-sqlite.mjs` e `db:backup`.

### Non-Goals (Fora de Escopo)

- Provisionamento de infraestrutura específica em provedor cloud (VPS, Fly.io, Railway) ou configuração de DNS/TLS externo.
- Substituição do SQLite por SGBD cliente-servidor externo nesta fase.
- Agentes externos de coleta de métricas/APM proprietários (Datadog, New Relic).

## Capabilities

### New Capabilities

- `deployment-and-operations`: Consolida os requisitos de build de produção Nitro (`node-server`), containerização Docker multi-stage com `better-sqlite3` sob usuário não-root, execução transacional de migrations no boot, backup online atômico do SQLite com retenção de 14 snapshots, verificação de saúde (`GET /api/health`), pipeline CI/CD (Gates G1–G13 + verificação Docker) e observabilidade estruturada em JSON com redaction de dados sensíveis e PII.

### Modified Capabilities

<!-- Nenhuma capacidade existente teve seus requisitos de domínio alterados. -->

## Impact

- **Servidor (`server/utils/`, `server/database/`, `server/plugins/`):** Adição de `server/utils/logger.ts` e `server/utils/backup-retention.ts`; adição de helper de backup em `server/database/client.ts`; atualização de `server/plugins/01.database-migrate.ts` e `server/utils/mailer.ts`.
- **Scripts e Operação (`scripts/`, `package.json`, `README.md`):** Novo script `scripts/backup-sqlite.mjs`, script `db:backup` no `package.json` e documentação de backup/rollback no `README.md`.
- **Testes (`test/unit/`, `test/arch/`):** Novos testes unitários `test/unit/logger.spec.ts` e `test/unit/backup-sqlite.spec.ts`, e expansão de `test/arch/docker.spec.ts`.
