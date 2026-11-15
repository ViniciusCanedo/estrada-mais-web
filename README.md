# Nuxt 4 Scaffolding

Template e _scaffolding_ corporativo para aplicações web modernas construídas com **Nuxt 4** e **TypeScript estrito**, projetado com arquitetura em camadas, geração automatizada de cliente HTTP via OpenAPI e _quality gates_ automatizados de ponta a ponta.

> As diretrizes arquiteturais, limites de complexidade e regras normativas deste repositório estão documentadas em [`.agents/CONSTITUTION.md`](./.agents/CONSTITUTION.md) e [`AGENTS.md`](./AGENTS.md).

---

## Sumário

- [Sobre o Projeto](#sobre-o-projeto)
- [Stack Tecnológica](#stack-tecnológica)
- [Arquitetura e Estrutura de Diretórios](#arquitetura-e-estrutura-de-diretórios)
- [Desenvolvimento](#desenvolvimento)
  - [Pré-requisitos](#pré-requisitos)
  - [Configuração Inicial](#configuração-inicial)
  - [Servidor de Desenvolvimento](#servidor-de-desenvolvimento)
  - [Geração do Cliente HTTP (Orval / OpenAPI)](#geração-do-cliente-http-orval--openapi)
  - [Scripts de Qualidade e Testes](#scripts-de-qualidade-e-testes)
- [Produção](#produção)
  - [Build e Execução Nativa (Node.js / Nitro)](#build-e-execução-nativa-nodejs--nitro)
  - [Execução com Docker e Docker Compose](#execução-com-docker-e-docker-compose)

---

## Sobre o Projeto

Este projeto fornece uma base padronizada para o desenvolvimento de aplicações **SSR / Full-Stack** em Nuxt 4, garantindo:

- **Isolamento rigoroso de camadas**: separação entre interface/cliente (`app/`), servidor Nitro (`server/`) e código isomórfico puro (`shared/`), validada automaticamente por `dependency-cruiser`.
- **Segurança por padrão**: cabeçalhos HTTP e políticas configuradas com `nuxt-security`, validação de fronteiras com `zod` e varredura de segredos via `secretlint`.
- **Contratos de API tipados**: geração automatizada de schemas e clientes HTTP a partir da especificação `openapi.json` usando **Orval**, integrada ao wrapper reativo `useApiFetch`.
- **Governança e Qualidade Contínua**: pipeline único (`npm run quality`) que valida formatação, lint, tipagem estrita, duplicação de código, dependências não utilizadas, testes unitários/integração/arquitetura/E2E, auditoria de pacotes e build de produção.

---

## Stack Tecnológica

| Categoria                   | Tecnologias                                                                                                    |
| --------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Core & SSR**              | [Nuxt 4](https://nuxt.com/), [Vue 3](https://vuejs.org/), [Nitro](https://nitro.build/)                        |
| **Linguagem & Validação**   | [TypeScript 6](https://www.typescriptlang.org/) (`strict: true`), [Zod 4](https://zod.dev/)                    |
| **UI & Estilização**        | [`@nuxt/ui` v4](https://ui.nuxt.com/), [Tailwind CSS v4](https://tailwindcss.com/), Lucide Icons               |
| **Gerenciamento de Dados**  | [Pinia](https://pinia.vuejs.org/), [Orval](https://orval.dev/) (OpenAPI client generator)                      |
| **Segurança**               | [`nuxt-security`](https://nuxt-security.vercel.app/), `secretlint`                                             |
| **Testes**                  | [Vitest](https://vitest.dev/), `@nuxt/test-utils`, [Playwright](https://playwright.dev/), [k6](https://k6.io/) |
| **Qualidade & Arquitetura** | ESLint (Flat Config + SonarJS + A11y + Tailwind), Prettier, `dependency-cruiser`, `knip`, `jscpd`              |
| **Git Hooks & Commits**     | Husky, `lint-staged`, `commitlint` (Conventional Commits)                                                      |

---

## Arquitetura e Estrutura de Diretórios

```text
├── .agents/                # Constituição do projeto (CONSTITUTION.md) e skills de agentes
├── app/                    # Aplicação cliente/SSR (srcDir padrão do Nuxt 4)
│   ├── assets/             # Folhas de estilo globais (Tailwind CSS v4)
│   ├── components/         # Componentes visuais (@nuxt/ui v4); sem I/O direto
│   ├── composables/        # Lógica reativa reutilizável (ex.: useApiFetch)
│   ├── layouts/            # Layouts da aplicação
│   ├── middleware/         # Middlewares de navegação cliente/SSR
│   ├── pages/              # Páginas e roteamento baseado em arquivos
│   ├── plugins/            # Plugins do Nuxt
│   ├── stores/             # Stores de estado global (Pinia)
│   ├── types/              # Tipos exclusivos da camada cliente
│   └── utils/              # Funções utilitárias da camada cliente
├── docker/
│   └── prod/Dockerfile     # Dockerfile multi-stage para produção (node:24-bookworm-slim)
├── docs/adr/               # Architecture Decision Records (ADRs)
├── server/                 # Backend Nitro
│   ├── api/                # Handlers HTTP finos (validação → service → resposta)
│   ├── middleware/         # Middlewares de servidor
│   ├── plugins/            # Plugins do Nitro
│   ├── routes/             # Rotas customizadas do servidor
│   └── utils/              # Utilitários exclusivos do servidor
├── shared/                 # Código isomórfico compartilhado entre app/ e server/
│   ├── http/               # Cliente HTTP e schemas gerados pelo Orval (NÃO editar à mão)
│   ├── lib/                # Adaptadores de infraestrutura HTTP isomórficos (ex.: mutator customFetch)
│   ├── types/              # Tipos compartilhados entre cliente e servidor
│   └── utils/              # Schemas Zod e utilitários isomórficos
├── test/                   # Suítes de testes automatizados
│   ├── arch/               # Testes de arquitetura e infraestrutura (camadas e Docker)
│   ├── e2e/                # Testes ponta a ponta com Playwright
│   ├── load/               # Scripts de teste de carga/smoke com k6
│   ├── nuxt/               # Testes de integração com runtime Nuxt (happy-dom)
│   └── unit/               # Testes unitários rápidos em Node puro
├── docker-compose.prod.yml # Orquestração do container de produção
├── nuxt.config.ts          # Configuração principal do Nuxt 4
├── openapi.json            # Especificação OpenAPI para geração de cliente HTTP
└── orval.config.ts         # Configuração do Orval
```

---

## Desenvolvimento

### Pré-requisitos

- **Node.js**: versão **24 LTS** (recomendado `>= 24.x`)
- **npm**: versão **10+**
- **Playwright Chromium**: necessário para execução dos testes E2E locais
- **k6** _(opcional)_: necessário apenas para execução dos testes de carga (`npm run test:load:smoke`)

### Configuração Inicial

1. **Clone o repositório e instale as dependências**:

```bash
npm install
```

> Para ambientes de CI ou instalação limpa e determinística a partir do `package-lock.json`, utilize `npm ci`.

2. **Configure as variáveis de ambiente**:

Copie o arquivo `.env.example` para `.env` na raiz do projeto:

```bash
cp .env.example .env
```

Variáveis disponíveis em `.env`:

| Variável               | Valor Padrão     | Descrição                                                             |
| ---------------------- | ---------------- | --------------------------------------------------------------------- |
| `NUXT_PUBLIC_API_BASE` | `/api`           | URL base pública utilizada pelo cliente HTTP (`runtimeConfig.public`) |
| `API_SPEC_PATH`        | `./openapi.json` | Caminho ou URL da especificação OpenAPI consumida pelo Orval          |

3. **Instale o navegador do Playwright** (primeira execução para testes E2E):

```bash
npx playwright install --with-deps chromium
```

### Servidor de Desenvolvimento

Inicie o servidor de desenvolvimento com _Hot Module Replacement (HMR)_ e Nuxt DevTools habilitado em `http://localhost:3000`:

```bash
npm run dev
```

### Geração do Cliente HTTP (Orval / OpenAPI)

Sempre que a especificação `openapi.json` (ou o caminho definido em `API_SPEC_PATH`) for atualizada, regenere os schemas e funções HTTP em `shared/http/`:

```bash
npm run api:generate
```

> **Atenção:** Os arquivos dentro de `shared/http/` são gerados automaticamente e **não devem** ser editados manualmente.
>
> - Para importar clientes e schemas gerados tanto em `app/` quanto em `server/`, utilize o alias `#shared/http/...`.
> - Para buscas de dados reativas com suporte a SSR, utilize o composable `useApiFetch`.
> - Para chamadas imperativas ou mutações (`POST`, `PUT`, `DELETE`), utilize as funções geradas pelo Orval.

### Scripts de Qualidade e Testes

O comando canônico que executa todos os _Quality Gates_ do projeto em sequência é:

```bash
npm run quality
```

Você também pode executar cada verificação ou suíte de testes individualmente durante o desenvolvimento:

| Comando                   | Descrição                                                                                |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| `npm run check`           | Execução rápida de `typecheck`, `lint` e `format:check`                                  |
| `npm run format`          | Formata todos os arquivos do projeto com Prettier                                        |
| `npm run format:check`    | Verifica se todos os arquivos estão formatados corretamente                              |
| `npm run lint`            | Executa o ESLint com tolerância zero a avisos (`--max-warnings 0`)                       |
| `npm run lint:fix`        | Executa o ESLint aplicando correções automáticas                                         |
| `npm run typecheck`       | Verifica tipos TypeScript (`nuxt typecheck` / `vue-tsc` em modo `strict`)                |
| `npm run deps:check`      | Valida regras de fronteira e ausência de ciclos entre camadas (`dependency-cruiser`)     |
| `npm run dup:check`       | Verifica duplicação de código em `app`, `server` e `shared` (`jscpd` ≤ 3%)               |
| `npm run unused:check`    | Detecta arquivos órfãos, exportações e dependências não utilizadas (`knip`)              |
| `npm run test`            | Inicia o Vitest em modo _watch_ interativo                                               |
| `npm run test:unit`       | Executa os testes unitários (`unit`) e de componentes/runtime (`nuxt`)                   |
| `npm run test:coverage`   | Executa testes unitários e Nuxt com relatório e validação de limites de cobertura (`v8`) |
| `npm run test:arch`       | Executa os testes automatizados de arquitetura e infraestrutura (`test/arch/`)           |
| `npm run test:e2e`        | Executa os testes ponta a ponta com Playwright                                           |
| `npm run test:e2e:ui`     | Abre a interface interativa do Playwright para depuração de testes E2E                   |
| `npm run test:load:smoke` | Executa teste de _smoke_ de carga com k6 contra `/api/health` (requer servidor ativo)    |
| `npm run audit:check`     | Verifica vulnerabilidades `high` ou `critical` nas dependências                          |
| `npm run secrets:check`   | Verifica a presença de segredos ou credenciais expostas no repositório (`secretlint`)    |

---

## Produção

### Build e Execução Nativa (Node.js / Nitro)

1. **Gerar o build de produção**:

Compila a aplicação cliente e o servidor Nitro standalone no diretório `.output/`:

```bash
npm run build
```

2. **Visualizar localmente o build de produção (Preview)**:

```bash
npm run preview
```

3. **Executar diretamente o servidor Nitro em produção**:

O bundle gerado em `.output/` é autossuficiente e não requer `node_modules` de desenvolvimento:

```bash
NODE_ENV=production NITRO_HOST=0.0.0.0 NITRO_PORT=3000 node .output/server/index.mjs
```

> Caso deseje pré-renderizar a aplicação estaticamente (SSG), utilize `npm run generate`.

---

### Execução com Docker e Docker Compose

O projeto conta com uma imagem Docker _multi-stage_ otimizada para produção em [`docker/prod/Dockerfile`](./docker/prod/Dockerfile), baseada em `node:24-bookworm-slim`, executando sob usuário não-privilegiado (`USER node`) e com `HEALTHCHECK` nativo apontando para `/api/health`.

1. **Certifique-se de que o arquivo `.env` existe na raiz do projeto**:

```bash
cp .env.example .env
```

2. **Construa a imagem Docker de produção**:

```bash
docker build -f docker/prod/Dockerfile -t sistemastvem/nuxt_scaffolding:latest .
```

3. **Inicie o container de produção com Docker Compose**:

```bash
docker compose -f docker-compose.prod.yml up -d
```

> Por padrão, a aplicação ficará disponível na porta `3000` (ou na porta definida pela variável `PORT` no ambiente/`.env`).

4. **Verifique o status do container e do healthcheck (`/api/health`)**:

```bash
docker compose -f docker-compose.prod.yml ps
```

5. **Visualize os logs em tempo real** _(opcional)_:

```bash
docker compose -f docker-compose.prod.yml logs -f app
```

6. **Encerre o container de produção**:

```bash
docker compose -f docker-compose.prod.yml down
```

---

## Documentação Adicional

- [Constituição do Projeto (`.agents/CONSTITUTION.md`)](./.agents/CONSTITUTION.md) — Regras de arquitetura, qualidade, código e testes.
- [Guia de Testes (`test/README.md`)](./test/README.md) — Organização das suítes `unit`, `nuxt` e `e2e`.
- [ADRs (`docs/adr/`)](./docs/adr/) — Registros de decisões arquiteturais do projeto.
- [Documentação Oficial do Nuxt 4](https://nuxt.com/docs/getting-started/introduction) — Guia completo do framework.
