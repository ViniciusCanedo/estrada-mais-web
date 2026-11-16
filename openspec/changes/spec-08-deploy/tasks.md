## 1. Observabilidade e Logs Estruturados

- [x] 1.1 Implementar `server/utils/logger.ts` com emissão JSON em `process.stdout.write` (`info`, `warn`) e `process.stderr.write` (`error`), redaction recursiva de credenciais (`password`, `currentPassword`, `newPassword`, `passwordHash`, `token`, `tokenHash`, `cookie`, `authorization`, `secret`) e mascaramento de e-mails (`[REDACTED_EMAIL]`).
- [x] 1.2 Integrar `logger` estruturado em `server/plugins/01.database-migrate.ts` e `server/utils/mailer.ts` preservando compatibilidade com os testes existentes.
- [x] 1.3 Criar `test/unit/logger.spec.ts` cobrindo níveis `info`/`warn`/`error`, saída em `stdout`/`stderr`, redaction de campos sensíveis em objetos aninhados e mascaramento de endereços de e-mail em mensagens e metadados.

## 2. Backup Online Consistente do SQLite e Retenção de 14 Snapshots

- [ ] 2.1 Implementar `server/utils/backup-retention.ts` com geração de nomes de snapshot (`pre-deploy-YYYYMMDD-HHMMSS.db` e `backup-YYYY-MM-DD.db`) e poda automática (`pruneOldBackups`) mantendo os 14 snapshots mais recentes.
- [ ] 2.2 Implementar `backupSqliteDatabase` em `server/database/client.ts` utilizando a API nativa `.backup(destinationPath)` do `better-sqlite3` integrada à política de retenção de 14 arquivos.
- [ ] 2.3 Criar `scripts/backup-sqlite.mjs`, adicionar script `"db:backup": "node scripts/backup-sqlite.mjs"` em `package.json` e documentar rotina de backup e rollback em produção no `README.md`.
- [ ] 2.4 Criar `test/unit/backup-sqlite.spec.ts` validando backup online real em modo WAL (com dados íntegros de `drivers` e `trips` no snapshot gerado) e retenção exata dos 14 snapshots mais recentes.

## 3. Verificação Arquitetural de Deploy, CI/CD e Quality Gates

- [ ] 3.1 Revisar `docker/prod/Dockerfile`, `docker-compose.prod.yml`, `.dockerignore` e `.github/workflows/quality.yml` conforme `docs/raw_specs/08-deploy.md` e expandir `test/arch/docker.spec.ts` para validar o workflow CI/CD (`quality` e `docker-verify`), `scripts/backup-sqlite.mjs` e o script `db:backup`.
- [ ] 3.2 Executar formatação (`npm run format`) e validar aprovação integral no gate canônico `npm run quality` (G1 a G13).
