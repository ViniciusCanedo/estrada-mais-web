## Context

O Estrada+ já conta com a fundação de banco SQLite em modo WAL (`server/database/client.ts`), execução de migrations no boot (`server/plugins/01.database-migrate.ts`), endpoint de healthcheck (`GET /api/health`), `docker/prod/Dockerfile`, `docker-compose.prod.yml` e workflow `.github/workflows/quality.yml`. Para concluir integralmente a especificação `08-deploy` (`docs/raw_specs/08-deploy.md`) e atender às regras da `.agents/CONSTITUTION.md` (§2, §4.4, §8), restam três entregas técnicas centrais:

1. **Observabilidade Estruturada (`server/utils/logger.ts`):** Centralizar a emissão de logs JSON em `process.stdout.write` / `process.stderr.write` com redaction recursiva de credenciais, tokens, cookies e endereços de e-mail, integrando-o aos pontos do servidor que hoje escrevem texto livre nas streams (`01.database-migrate.ts` e `mailer.ts`).
2. **Backup Online Consistente do SQLite com Retenção (`scripts/backup-sqlite.mjs` + helpers):** O modo WAL exige o uso da API nativa `.backup(destinationPath)` do `better-sqlite3` em vez de cópia direta de arquivo via sistema operacional, além da poda automática para reter os últimos 14 snapshots (`pre-deploy-YYYYMMDD-HHMMSS.db` ou `backup-YYYY-MM-DD.db`).
3. **Verificação Arquitetural Completa (`test/arch/docker.spec.ts`):** Garantir em teste automatizado que `.github/workflows/quality.yml`, `scripts/backup-sqlite.mjs` e `package.json` (`db:backup`) cumprem todos os contratos da spec `08-deploy`.

## Goals / Non-Goals

**Goals:**

- Implementar `server/utils/logger.ts` puro, tipado, dentro dos limites de complexidade da Constituição (ciclomática ≤ 10, cognitiva ≤ 15, ≤ 50 linhas por função) e com cobertura ≥ 90%.
- Respeitar rigorosamente as regras do `.dependency-cruiser.cjs` (`only-repos-access-drizzle` e `no-orphans`):
  - `server/utils/**` não pode importar `better-sqlite3` nem `server/database/**`.
  - A lógica pura de formatação de nomes de snapshot e política de retenção (poda mantendo os 14 arquivos mais recentes) fica em `server/utils/backup-retention.ts`.
  - A função que abre o banco SQLite via `better-sqlite3` e executa `.backup(destinationPath)` combinada à retenção fica em `server/database/client.ts` (`backupSqliteDatabase`), que já detém a fronteira autorizada com `better-sqlite3`.
  - O script CLI `scripts/backup-sqlite.mjs` (invocado via `npm run db:backup` ou `docker exec`) utiliza a API `.backup()` do `better-sqlite3` e aplica a retenção de 14 snapshots no diretório `/app/data/backups` (ou diretório configurado via argumentos/variáveis de ambiente).
- Garantir compatibilidade retroativa com todos os testes unitários, Nuxt, arquiteturais e E2E existentes.

**Non-Goals:**

- Não adicionar bibliotecas externas de logging (ex.: `pino` ou `winston`), pois a §7 da Constituição exige evitar dependências desnecessárias quando a plataforma nativa resolve o problema com simplicidade e segurança.
- Não alterar o modelo de dados ou criar novas migrations SQL.

## Decisions

### 1. Logger JSON nativo sem dependências externas (`server/utils/logger.ts`)

- **Decisão:** Construir `server/utils/logger.ts` sobre `process.stdout.write` (`info`, `warn`) e `process.stderr.write` (`error`), serializando objetos JSON de linha única (`JSON.stringify(entry) + '\n'`).
- **Sanitização / Redaction (LGPD & §8):**
  - Qualquer chave cujo nome normalizado coincida com campos sensíveis (`password`, `currentpassword`, `newpassword`, `passwordhash`, `token`, `tokenhash`, `resettoken`, `cookie`, `set-cookie`, `authorization`, `secret`, `appsecret`, `smtppass`, `pass`) tem seu valor substituído por `'[REDACTED]'`.
  - Qualquer chave `email` ou strings contendo padrões de e-mail (`/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g`) ou query params `token=...` têm seus valores mascarados com `'[REDACTED_EMAIL]'` / `token=[REDACTED]`.
  - Instâncias de `Error` são convertidas de forma segura extraindo `name` e `message` sanitizada.
- **Alternativas consideradas:** Usar `pino`. Descartado pela §7 da Constituição (zero dependências extras para uma funcionalidade de ~100 linhas).

### 2. Arquitetura do Backup Online SQLite respeitando `dependency-cruiser`

- **Decisão:** Dividir a responsabilidade em três partes coesas:
  1. `server/utils/backup-retention.ts`: Funções utilitárias para formatação de timestamp (`formatBackupFilename(date, prefix)` gerando `pre-deploy-YYYYMMDD-HHMMSS.db` ou `backup-YYYY-MM-DD.db`) e aplicação da política de retenção em diretório (`pruneOldBackups(backupDir, maxSnapshots = 14)`), ordenando os snapshots `.db` elegíveis e removendo os excedentes mais antigos.
  2. `server/database/client.ts`: Exporta `backupSqliteDatabase({ sourcePath, backupDir, prefix, maxSnapshots, now })`, que valida a existência do banco de origem, abre conexão `better-sqlite3`, executa `await sqlite.backup(destinationPath)` de forma atômica sobre bancos em modo WAL e aciona a poda de retenção para manter no máximo 14 snapshots.
  3. `scripts/backup-sqlite.mjs`: Script CLI autônomo executável via `npm run db:backup` (em desenvolvimento, CI ou container de produção) que executa o backup atômico via `better-sqlite3` e aplica a retenção de 14 snapshots.
- **Por quê:** `.dependency-cruiser.cjs` proíbe `server/utils/**` de importar `better-sqlite3` ou `server/database/**` (`only-repos-access-drizzle`), e proíbe novos arquivos órfãos em `server/database/` que não sejam importados por `client.ts`/`migrate.ts`/`seed.ts` (`no-orphans`). Colocar `backupSqliteDatabase` em `server/database/client.ts` e a retenção em `server/utils/backup-retention.ts` satisfaz 100% das regras de fronteira e do `knip`.

## Risks / Trade-offs

- **[Risk] Quebra de testes existentes que inspecionam `process.stdout.write` / `process.stderr.write`** → **Mitigation:** Nos testes existentes (`test/unit/mailer.spec.ts` e `test/unit/database.spec.ts`), `mailer.spec.ts` verifica que `stdoutSpy` foi chamado 1 vez e não contém o e-mail nem o token; `database.spec.ts` verifica que `stderrSpy` foi chamado 1 vez quando `runMigrations` falha. Ao usar `logger.info` em `mailer.ts` e `logger.error` em `01.database-migrate.ts`, cada um continua invocando `process.stdout.write` / `process.stderr.write` exatamente 1 vez e sem vazar segredos.
- **[Risk] Concorrência durante backup em modo WAL** → **Mitigation:** A API `.backup()` do `better-sqlite3` utiliza a Online Backup API nativa do SQLite (`sqlite3_backup_init`), copiando páginas de forma incremental e reiniciando de maneira transparente caso uma escrita concorrente ocorra, garantindo snapshot 100% consistente.

## Migration Plan

1. Implementar `server/utils/logger.ts` e atualizar `server/plugins/01.database-migrate.ts` e `server/utils/mailer.ts`.
2. Implementar `server/utils/backup-retention.ts`, `backupSqliteDatabase` em `server/database/client.ts`, `scripts/backup-sqlite.mjs` e script `"db:backup"` em `package.json`.
3. Atualizar `README.md` documentando `npm run db:backup`, a retenção de 14 snapshots e o procedimento de rollback em produção.
4. Criar `test/unit/logger.spec.ts`, `test/unit/backup-sqlite.spec.ts` e expandir `test/arch/docker.spec.ts`.
5. Executar `npm run quality` completo garantindo aprovação nos gates G1–G13.

## Open Questions

- Os 4 pontos operacionais externos listados na seção 11.2 de `docs/raw_specs/08-deploy.md` (escolha de provedor cloud, domínio TLS, registry de CD e credenciais SMTP de produção) permanecem parametrizados via variáveis de ambiente (`runtimeConfig` e `docker-compose.prod.yml`) sem bloquear o pacote de deploy.
