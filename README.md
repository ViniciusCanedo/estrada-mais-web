# Estrada+ | Telemetria & Controle de Custos para Motoristas Autônomos

Sistema web full-stack de telemetria de percurso, controle de despesas operacionais (Ledger) e apuração de custo por quilômetro (`R$/km`) e sobra líquida para **Transportadores Autônomos de Cargas (TAC)**, construído com **Nuxt 4**, **TypeScript estrito**, **@nuxt/ui v4**, **Tailwind CSS v4**, **Drizzle ORM + SQLite (`better-sqlite3`)** e **Zod 4**.

> As diretrizes arquiteturais, limites de complexidade e _Quality Gates_ normativos deste repositório estão documentados em [`.agents/CONSTITUTION.md`](./.agents/CONSTITUTION.md), [`AGENTS.md`](./AGENTS.md) e nas especificações técnicas em [`docs/raw_specs/`](./docs/raw_specs/).

---

## Stack Tecnológica

| Categoria                   | Tecnologias                                                                                                     |
| --------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Framework & SSR**         | [Nuxt 4](https://nuxt.com/), [Vue 3](https://vuejs.org/), [Nitro](https://nitro.build/)                         |
| **Banco de Dados & ORM**    | SQLite (`better-sqlite3` em modo WAL), [Drizzle ORM](https://orm.drizzle.team/), `drizzle-kit`, `drizzle-seed`  |
| **Validação & Contratos**   | [TypeScript 6](https://www.typescriptlang.org/) (`strict: true`), [Zod 4](https://zod.dev/) em `shared/schemas` |
| **UI & Design System**      | [`@nuxt/ui` v4](https://ui.nuxt.com/), [Tailwind CSS v4](https://tailwindcss.com/) (Tema _Night Highway_)       |
| **Estado & Segurança**      | [Pinia](https://pinia.vuejs.org/), `nuxt/server` (`useSession`), `node:crypto` (`scrypt`), `nuxt-security`      |
| **Testes**                  | [Vitest](https://vitest.dev/), `@nuxt/test-utils`, [Playwright](https://playwright.dev/), [k6](https://k6.io/)  |
| **Qualidade & Arquitetura** | ESLint (Flat Config + SonarJS + A11y + Tailwind), Prettier, `dependency-cruiser`, `knip`, `jscpd`, `secretlint` |

---

## Estrutura de Pastas

```text
├── .agents/                    # Constituição normativa (CONSTITUTION.md) e skills
├── app/                        # Aplicação Cliente/SSR (Nuxt 4 srcDir)
│   ├── assets/css/main.css     # Tokens Tailwind CSS v4 e paleta Night Highway
│   ├── components/             # Componentes visuais (@nuxt/ui v4); sem I/O direto
│   ├── composables/            # Lógica reativa e comunicação HTTP (useApiFetch, useTrips, etc.)
│   ├── layouts/                # Layouts (default, auth, print)
│   ├── middleware/             # Middleware global de autenticação
│   ├── pages/                  # Páginas da aplicação
│   ├── stores/                 # Stores Pinia
│   └── utils/                  # Formatadores de moeda, distância, litragem e datas (pt-BR)
├── docker/
│   └── prod/Dockerfile         # Dockerfile multi-stage para produção (node:24-bookworm-slim)
├── docs/
│   ├── adr/                    # Architecture Decision Records (ADRs)
│   └── raw_specs/              # Especificações técnicas por módulo (00 a 08)
├── server/                     # Backend Nitro em 3 camadas
│   ├── api/                    # Camada 1: Endpoints HTTP (validação Zod -> service -> resposta)
│   ├── services/               # Camada 2: Regras de negócio e cálculos operacionais
│   ├── repositories/           # Camada 3: Único ponto de acesso ao Drizzle ORM
│   ├── database/               # Conexão better-sqlite3, schema Drizzle, migrations e seeds
│   ├── plugins/                # Execução automática de migrations no boot
│   └── utils/                  # Tratamento de erros de domínio, criptografia, rate-limit e SMTP
├── shared/                     # Código isomórfico puro compartilhado entre app/ e server/
│   ├── schemas/                # Schemas Zod reutilizados na API e nos formulários do front-end
│   ├── types/                  # Tipos de domínio inferidos via z.infer
│   └── utils/                  # Conversores de unidades (centavos, decilitros, kg) e fórmulas
└── test/                       # Suítes automatizadas (unit, nuxt, arch, e2e, load)
```

---

## Pré-requisitos

- **Node.js**: versão **24 LTS** (`>= 24.x`)
- **npm**: versão **10+**
- **Playwright Chromium**: para execução dos testes E2E (`npx playwright install --with-deps chromium`)
- **k6** _(opcional)_: para execução dos testes de carga (`npm run test:load:smoke`)

---

## Setup Inicial e Desenvolvimento

1. **Instale as dependências**:

```bash
npm install
```

2. **Configure as variáveis de ambiente**:

```bash
cp .env.example .env
```

3. **Execute as migrations e popule o banco de desenvolvimento (seed)**:

```bash
npm run db:migrate
npm run db:seed
```

4. **Inicie o servidor de desenvolvimento** em `http://localhost:3000`:

```bash
npm run dev
```

---

## Scripts Disponíveis

| Comando                   | Descrição                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------- |
| `npm run dev`             | Inicia o servidor Nuxt 4 em modo de desenvolvimento com HMR                            |
| `npm run build`           | Gera o build de produção em `.output/`                                                 |
| `npm run preview`         | Inicia visualização local do build de produção                                         |
| `npm run db:generate`     | Gera arquivos de migration SQL a partir de `server/database/schema.ts` (`drizzle-kit`) |
| `npm run db:migrate`      | Aplica as migrations pendentes no banco SQLite configurado em `NUXT_DATABASE_URL`      |
| `npm run db:seed`         | Popula o banco local com dados iniciais de desenvolvimento (`drizzle-seed`)            |
| `npm run db:studio`       | Abre o Drizzle Studio para inspeção visual do banco SQLite                             |
| `npm run check`           | Execução rápida de `typecheck`, `lint` e `format:check`                                |
| `npm run format`          | Formata todos os arquivos com Prettier                                                 |
| `npm run format:check`    | Gate G1: Verifica formatação com Prettier                                              |
| `npm run lint`            | Gate G2/G4: Executa ESLint com `--max-warnings 0` e limites de complexidade/tamanho    |
| `npm run typecheck`       | Gate G3: Verifica tipos TypeScript (`nuxt typecheck` em modo `strict`)                 |
| `npm run dup:check`       | Gate G5: Verifica duplicação de código (`jscpd` ≤ 3%)                                  |
| `npm run unused:check`    | Gate G6: Detecta arquivos órfãos, exports e dependências não usadas (`knip`)           |
| `npm run deps:check`      | Gate G7: Valida fronteiras arquiteturais e ausência de ciclos (`dependency-cruiser`)   |
| `npm run test:arch`       | Gate G8: Executa testes automatizados de arquitetura e Docker (`test/arch/`)           |
| `npm run test:unit`       | Executa testes unitários/repositórios (`unit`) e de componentes/runtime (`nuxt`)       |
| `npm run test:coverage`   | Gate G9: Executa testes com validação de cobertura mínima (80% global / 90% core)      |
| `npm run audit:check`     | Gate G11: Verifica ausência de vulnerabilidades `high` ou `critical` (`npm audit`)     |
| `npm run secrets:check`   | Gate G12: Verifica ausência de segredos expostos (`secretlint`)                        |
| `npm run test:e2e`        | Gate G13: Executa testes E2E com Playwright                                            |
| `npm run test:load:smoke` | Gate G14: Executa smoke test de carga com k6                                           |
| `npm run quality`         | **Comando Canônico:** Executa todos os gates obrigatórios (G1 a G13) em sequência      |

---

## Execução com Docker (Produção)

1. **Construa a imagem multi-stage de produção**:

```bash
docker build -f docker/prod/Dockerfile -t estrada-mais-web:latest .
```

2. **Inicie o container com volume persistente SQLite via Docker Compose**:

```bash
docker compose -f docker-compose.prod.yml up -d
```

3. **Verifique o status e o healthcheck (`/api/health`)**:

```bash
docker compose -f docker-compose.prod.yml ps
```
