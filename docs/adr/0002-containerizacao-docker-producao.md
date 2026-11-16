# ADR 0002: Containerização Docker exclusiva para produção com `node:24-bookworm-slim`

- **Data:** 2026-10-27
- **Status:** Aceito
- **Regras relacionadas:** §3 (Quality Gates), §8 (Segurança) e §10.3 da [`.agents/CONSTITUTION.md`](../../.agents/CONSTITUTION.md)

## Contexto

O projeto precisa de uma configuração padronizada, determinística e segura para empacotamento e execução em produção via Docker (`docker/prod/Dockerfile` e `docker-compose.prod.yml`), sem introduzir sobrecarga de virtualização ou duplicação de `node_modules` e navegadores do Playwright no fluxo de desenvolvimento local.

## Decisões Arquiteturais

1. **Escopo restrito à produção (desenvolvimento, testes e hooks nativos no host):**
   - O fluxo de desenvolvimento (`npm run dev`), a verificação completa de qualidade (`npm run quality`, incluindo o Playwright E2E) e os Git hooks do Husky (`.husky/pre-commit`, `commit-msg`, `pre-push`) permanecem executando nativamente no host e no pipeline de CI.
   - Isso evita problemas de latência de I/O em _bind mounts_ no Windows/WSL e elimina a necessidade de instalar dependências pesadas de navegador na imagem Docker da aplicação.

2. **Imagem base `node:24-bookworm-slim`:**
   - Garante paridade com a versão LTS do Node.js v24 utilizada no projeto e compatibilidade nativa com binários `glibc` (como `esbuild` e `unrs-resolver`), mantendo uma superfície enxuta baseada no Debian Bookworm.

3. **Build _multi-stage_ e execução não-root (`USER node`):**
   - O primeiro estágio (`build`) executa `npm ci` e `npm run build`, gerando o bundle standalone do Nitro em `.output/`.
   - O segundo estágio (`runner`) copia exclusivamente `.output/` e `package.json` com permissão `node:node` e executa o servidor sob o usuário não-privilegiado `node`.

4. **`HEALTHCHECK` nativo sem pacotes adicionais:**
   - Como `node:24-bookworm-slim` não inclui `curl` ou `wget` por padrão, o `HEALTHCHECK` utiliza o `fetch` nativo do Node.js 24 para consultar `http://localhost:3000/api/health`, evitando a instalação de pacotes extras via `apt-get` na imagem final.

## Consequências

- **Positivas:** Imagem de produção enxuta, sem `devDependencies` nem código-fonte bruto, rodando sem privilégios de `root` e monitorada pelo endpoint `/api/health`.
- **Verificação automatizada:** Os contratos estruturais de `.dockerignore`, `docker/prod/Dockerfile` e `docker-compose.prod.yml` são validados continuamente pelo teste de arquitetura em `test/arch/docker.spec.ts`.
