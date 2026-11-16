## ADDED Requirements

### Requirement: Build de Produção Nuxt 4 e Empacotamento de Addon Nativo

O sistema SHALL compilar a aplicação utilizando o preset padrão `node-server` do Nitro (`npm run build`), gerando o diretório standalone `.output/` contendo ativos estáticos imutáveis em `.output/public/` e o entrypoint HTTP `.output/server/index.mjs`, preservando o addon nativo compilado do `better-sqlite3`.

#### Scenario: Compilação e inicialização do servidor Nitro de produção

- **WHEN** o comando `npm run build` é executado em ambiente Node.js 24 LTS
- **THEN** o artefato `.output/server/index.mjs` e os binários do `better-sqlite3` MUST ser gerados sem erros, permitindo iniciar o servidor com `NODE_ENV=production NITRO_HOST=0.0.0.0 NITRO_PORT=3000 node .output/server/index.mjs`

### Requirement: Imagem Docker Multi-Stage e Execução sob Usuário Não-Root

A infraestrutura de produção SHALL utilizar `docker/prod/Dockerfile` em múltiplos estágios baseados em `node:24-bookworm-slim`, isolando ferramentas de compilação C++ (`python3`, `make`, `g++`) exclusivamente no estágio `build` e executando o estágio `runner` sob o usuário não-root `node` com volume persistente em `/app/data` e `.dockerignore` bloqueando segredos (`.env`) e bancos locais (`*.db`, `*.db-wal`, `*.db-shm`).

#### Scenario: Isolamento de segredos e permissões na imagem de produção

- **WHEN** a imagem Docker de produção é construída a partir de `docker/prod/Dockerfile`
- **THEN** o estágio final `runner` MUST conter apenas `.output/`, `server/database/migrations/` e `package.json`, executar sob `USER node`, expor a porta `3000` e persistir o banco em `/app/data/estrada.db` sem embutir variáveis sensíveis como `NUXT_APP_SECRET`

### Requirement: Execução Transacional de Migrations no Boot do Servidor

O servidor Nitro SHALL executar automaticamente todas as migrations SQL pendentes em `server/database/migrations` durante a inicialização via plugin `server/plugins/01.database-migrate.ts` sobre a conexão SQLite configurada em modo `WAL` (`foreign_keys = ON`, `busy_timeout = 5000`), antes de aceitar tráfego.

#### Scenario: Boot com migrations aplicadas com sucesso

- **WHEN** o servidor Nitro inicia apontando para um banco SQLite novo ou desatualizado
- **THEN** o plugin `01.database-migrate.ts` MUST aplicar as migrations pendentes de forma transacional, registrar log estruturado de sucesso e liberar o servidor para responder `200 OK` em `GET /api/health`

#### Scenario: Falha crítica de migration interrompe inicialização

- **WHEN** ocorre um erro de SQL ou de I/O durante a aplicação das migrations no boot
- **THEN** o plugin `01.database-migrate.ts` MUST registrar um log estruturado de nível `error` em `stderr` e relançar a exceção para impedir que um container inconsistente passe no healthcheck

### Requirement: Rotina de Backup Online Atômico do SQLite e Retenção de 14 Snapshots

O sistema SHALL fornecer utilitário programático e script CLI (`npm run db:backup` / `scripts/backup-sqlite.mjs`) que realizam backup online consistente do arquivo SQLite ativo em modo WAL utilizando a API nativa `.backup(destinationPath)` do `better-sqlite3`, gravando snapshots nomeados (`pre-deploy-YYYYMMDD-HHMMSS.db` ou `backup-YYYY-MM-DD.db`) no diretório de backups e mantendo retenção automática dos últimos 14 snapshots.

#### Scenario: Geração de backup íntegro com banco ativo em modo WAL

- **WHEN** a rotina de backup online é executada sobre um banco SQLite em modo WAL contendo registros de motoristas e viagens
- **THEN** o arquivo `.db` gerado no diretório de destino MUST conter uma cópia atômica e íntegra de todas as tabelas e dados commitados, sem corromper nem bloquear leituras da aplicação

#### Scenario: Poda automática de snapshots excedentes além do limite de 14 arquivos

- **WHEN** um novo backup é concluído e o diretório de backups passa a conter mais de 14 arquivos de snapshot `.db`
- **THEN** a rotina de retenção MUST manter exatamente os 14 snapshots mais recentes (ordenados cronologicamente) e remover do disco os arquivos mais antigos excedentes

### Requirement: Verificação de Saúde (Healthcheck) e Pipeline CI/CD

O sistema SHALL expor o endpoint `GET /api/health` validando a conectividade ativa com o SQLite (`SELECT 1`) e configurar o workflow `.github/workflows/quality.yml` com os jobs `quality` (executando `npm ci`, `db:migrate`, `db:seed` e `npm run quality` para os gates G1–G13) e `docker-verify` (construindo a imagem de produção e validando HTTP 200 em `/api/health`).

#### Scenario: Validação contínua dos Quality Gates e da imagem Docker no CI

- **WHEN** um push ou pull request para `main` aciona o workflow `.github/workflows/quality.yml`
- **THEN** o job `quality` MUST executar todos os gates G1–G13 com código de saída `0` e o job dependente `docker-verify` MUST construir a imagem `docker/prod/Dockerfile`, iniciar o container e confirmar resposta `"status":"ok"` em `GET /api/health`

### Requirement: Observabilidade por Logs JSON Estruturados com Redaction de Segredos e PII

O servidor SHALL emitir logs estruturados em formato JSON através de `server/utils/logger.ts` utilizando `process.stdout.write` para níveis `info` e `warn` e `process.stderr.write` para nível `error`, aplicando sanitização recursiva que substitui chaves sensíveis (`password`, `currentPassword`, `newPassword`, `passwordHash`, `token`, `tokenHash`, `cookie`, `authorization`, `secret`) por `'[REDACTED]'` e mascara endereços de e-mail em campos ou textos como `'[REDACTED_EMAIL]'`.

#### Scenario: Emissão de logs JSON nos fluxos de saída padrão e de erro

- **WHEN** `logger.info` ou `logger.warn` é invocado com mensagem e metadados
- **THEN** o utilitário MUST escrever uma linha JSON válida em `process.stdout.write` contendo `level`, `timestamp` ISO-8601, `message` e metadados sanitizados; e quando `logger.error` é invocado, MUST escrever em `process.stderr.write`

#### Scenario: Sanitização automática de credenciais, tokens e e-mails (LGPD / §8)

- **WHEN** qualquer função do `logger` recebe objetos aninhados ou mensagens contendo `password`, `currentPassword`, `newPassword`, `token`, `cookie`, `authorization` ou um endereço de e-mail como `motorista@estrada.com.br`
- **THEN** a saída JSON serializada NUNCA MUST conter o valor bruto desses segredos ou o e-mail completo, substituindo-os por `'[REDACTED]'` e `'[REDACTED_EMAIL]'`
