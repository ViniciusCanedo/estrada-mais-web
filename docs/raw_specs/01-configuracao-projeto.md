# 01 — Especificação Técnica: Configuração do Projeto (`configuracao-projeto`)

## Visão Geral

Esta especificação define a fundação obrigatória do repositório **Estrada+** antes do início de qualquer desenvolvimento funcional. Ela abrange a auditoria e o endurecimento dos _Quality Gates_, a atualização normativa da [`.agents/CONSTITUTION.md`](../../.agents/CONSTITUTION.md), a adequação das dependências (inclusão de Drizzle ORM + `better-sqlite3` + `drizzle-kit` + `drizzle-seed` + `nodemailer` e remoção do `orval`), a limpeza de resíduos do template inicial, a revisão completa de `README.md`, `.env.example` e `.gitignore`, a adequação da infraestrutura Docker para SQLite nativo e os testes de arquitetura que garantem o isolamento estrito em camadas (`server/api` → `server/services` → `server/repositories` → `server/database`).

---

## 1. Gates de Qualidade (`.agents/CONSTITUTION.md`)

### 1.1 Inventário Completo dos Gates

Todos os gates abaixo compõem a _Definition of Done_ canônica executada por `npm run quality`:

|  Gate   | Nome                                      | Comando                                                                               | Onde Roda                               | O que Verifica                                                                                                                                                                                       | Critério de Falha                                                                                                                                                                    |
| :-----: | :---------------------------------------- | :------------------------------------------------------------------------------------ | :-------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **G1**  | Formatação                                | `npm run format:check` (`prettier --check .`)                                         | Local, `pre-commit` (`lint-staged`), CI | Formatação padronizada de todos os arquivos e ordenação de classes Tailwind CSS v4.                                                                                                                  | Qualquer arquivo fora do padrão Prettier (`exit code != 0`).                                                                                                                         |
| **G2**  | Lint                                      | `npm run lint` (`eslint . --max-warnings 0`)                                          | Local, `pre-commit` (`lint-staged`), CI | Regras estritas de TypeScript, Vue 3/Nuxt 4, acessibilidade (`vuejs-accessibility`), Tailwind v4 (`better-tailwindcss`) e higiene (`no-console`, proibição de `process.env`).                        | `> 0` erros **ou** `> 0` warnings.                                                                                                                                                   |
| **G3**  | Tipos                                     | `npm run typecheck` (`nuxt typecheck`)                                                | Local, `pre-push`, CI                   | Checagem estática `vue-tsc` em modo `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true` nos contextos `app`, `server` e `shared`.                                   | Qualquer erro de compilação TypeScript.                                                                                                                                              |
| **G4**  | Complexidade e Tamanho                    | Executado dentro de `npm run lint`                                                    | Local, `pre-commit`, CI                 | Complexidade ciclomática `<= 10`, complexidade cognitiva (`sonarjs`) `<= 15`, linhas/função `<= 50`, linhas/arquivo `.ts` `<= 300`, linhas/SFC `.vue` `<= 250`, `max-depth <= 3`, `max-params <= 4`. | Qualquer função ou arquivo excedendo os limites da §4.1.                                                                                                                             |
| **G5**  | Duplicação (DRY)                          | `npm run dup:check` (`jscpd app server shared`)                                       | Local, CI                               | Blocos duplicados (`>= 6` linhas e `>= 50` tokens) em `app/`, `server/` e `shared/`.                                                                                                                 | Duplicação total `> 3%`.                                                                                                                                                             |
| **G6**  | Código Morto e Deps                       | `npm run unused:check` (`knip`)                                                       | Local, CI                               | Arquivos órfãos, exports não consumidos, tipos não usados e dependências declaradas mas não utilizadas (ou usadas sem declarar).                                                                     | Qualquer achado reportado pelo `knip`.                                                                                                                                               |
| **G7**  | Fronteiras de Dependência                 | `npm run deps:check` (`depcruise app server shared --config .dependency-cruiser.cjs`) | Local, CI                               | Isolamento entre `app/`, `server/` e `shared/`, fluxo `api -> services -> repositories -> database`, ausência de ciclos, órfãos e `devDependencies` em produção.                                     | Qualquer violação de regra (`error` ou `warn`).                                                                                                                                      |
| **G8**  | Testes de Arquitetura                     | `npm run test:arch` (`vitest run --project arch`)                                     | Local, CI                               | Testes automatizados em `test/arch/` que validam programaticamente as regras do `dependency-cruiser`, contratos de camadas e configuração Docker.                                                    | Qualquer teste falhando em `test/arch/*.spec.ts`.                                                                                                                                    |
| **G9**  | Testes Unitários + Integração + Cobertura | `npm run test:coverage` (`vitest run --project unit --project nuxt --coverage`)       | Local (`test:unit` no `pre-push`), CI   | Suítes `test/unit` (Node + SQLite `:memory:`) e `test/nuxt` (`happy-dom`) com cobertura V8.                                                                                                          | Qualquer teste falhando ou cobertura abaixo de: Global (`80%` statements/functions/lines, `75%` branches) ou `server/services/**`, `server/repositories/**` e `shared/**` (`< 90%`). |
| **G10** | Build de Produção                         | `npm run build` (`nuxt build`)                                                        | Local, Docker build, CI                 | Compilação SSR completa do cliente Vue e do bundle standalone Nitro (`.output/`).                                                                                                                    | Erro de compilação/bundling no Vite/Nitro.                                                                                                                                           |
| **G11** | Auditoria de Segurança                    | `npm run audit:check` (`node scripts/audit-check.mjs`)                                | Local, CI                               | Inspeção do `npm audit --json` sobre a árvore de dependências do `package-lock.json`.                                                                                                                | `>= 1` vulnerabilidade com severidade `high` ou `critical`.                                                                                                                          |
| **G12** | Detecção de Segredos                      | `npm run secrets:check` (`secretlint "**/*"`)                                         | Local, CI                               | Varredura de chaves privadas, tokens, senhas hardcoded e credenciais em todos os arquivos do projeto.                                                                                                | Qualquer segredo detectado pelo `@secretlint/secretlint-rule-preset-recommend`.                                                                                                      |
| **G13** | Testes Ponta a Ponta (E2E)                | `npm run test:e2e` (`playwright test`)                                                | Local, CI                               | Fluxos completos de usuário no navegador Chromium real via `@nuxt/test-utils/playwright`.                                                                                                            | Qualquer spec E2E falhando em `test/e2e/*.spec.ts`.                                                                                                                                  |
| **G14** | Teste de Carga / Smoke                    | `npm run test:load:smoke` (`k6 run test/load/smoke.js`)                               | Sob demanda / Pré-release               | Desempenho sob carga nas rotas críticas (`http_req_failed < 1%`, `p(95) < 500ms`).                                                                                                                   | Violação de qualquer threshold do k6.                                                                                                                                                |
| **Git** | Formato de Mensagem de Commit             | `npx --no -- commitlint --edit "$1"`                                                  | Hook `.husky/commit-msg`                | Padrão Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`).                                                                                                              | Mensagem fora do padrão Conventional Commits.                                                                                                                                        |

### 1.2 Lacunas Identificadas na Auditoria

1. **Ausência de regras de proteção da camada de banco de dados (`.dependency-cruiser.cjs` e `test/arch/layers.spec.ts`):**
   - Hoje existe a regra `api-via-services` (proibindo `server/api` → `server/repositories`), mas **não existe** regra impedindo que `server/api/**` importe diretamente `drizzle-orm`, `better-sqlite3` ou `server/database/**`.
   - Tampouco existe regra impedindo que `server/services/**` pule `server/repositories/**` e importe diretamente `drizzle-orm`, `better-sqlite3` ou `server/database/client.ts`.
   - Também não existe teste arquitetural verificando que todo endpoint que recebe payload (`POST`, `PUT`, `PATCH` ou query filtrada) realiza validação com schemas de `#shared/schemas/`.
2. **Ausência do Pipeline de CI no repositório (`.github/workflows/quality.yml`):**
   - A Constituição cita a CI na §11 e no Apêndice A.8, mas o diretório `.github/workflows/` não existe no repositório.
3. **Script `test:load` quebrado (`test/load/load.js` ausente):**
   - `package.json` define `"test:load": "k6 run test/load/load.js"`, porém apenas `test/load/smoke.js` existe em `test/load/`.
4. **Referências obsoletas ao Orval nos gates:**
   - `package.json`, `eslint.config.mjs`, `.jscpd.json`, `knip.json`, `vitest.config.ts` e `.dependency-cruiser.cjs` contêm exceções e scripts voltados para `shared/http/**` e `orval.config.ts`, que devem ser substituídos pela estrutura de `shared/schemas/**` e `drizzle.config.ts`.
5. **Cobertura de `server/repositories/**` não exigida explicitamente no `vitest.config.ts`:**
   - `vitest.config.ts` exige 90% para `server/services/**` e `shared/**`, mas deve incluir `server/repositories/**` no threshold e no escopo de testes de integração com SQLite `:memory:`.

---

## 2. Atualização da CONSTITUTION (`.agents/CONSTITUTION.md`)

### 2.1 Partes Genéricas/Obsoletas Removidas ou Substituídas

- **Remoção do Orval e OpenAPI manual:** Todas as menções a `Orval`, `openapi.json`, `orval.config.ts`, `shared/http/**`, `shared/lib/client.ts` e `npm run api:generate` (Cabeçalho, §2.1, §2.2, §2.3, §4.2 e Apêndice A) são removidas.
- **Inclusão das Regras Específicas do Estrada+:**
  - **Camadas estritas de Backend:** `server/api/**` (roteamento HTTP + validação Zod) → `server/services/**` (regras de negócio e conversão de unidades) → `server/repositories/**` (único ponto de acesso ao Drizzle ORM) → `server/database/**` (conexão `better-sqlite3`, schema e migrations).
  - **Schemas Zod Isomórficos em `shared/schemas/`:** Reutilizados obrigatoriamente nos handlers da API (`readValidatedBody`, `getValidatedQuery`, `getValidatedRouterParams`) e nos formulários do front-end (`UForm :schema="..."`), com mensagens de erro em `pt-BR`.
  - **Regras de Banco de Dados e Migrations (Drizzle + SQLite):** Portabilidade de schema (valores monetários em centavos `integer`, volumes em decilitros `integer`, pesos em kg `integer`, datas em `text` ISO-8601), proibição de editar migrations já geradas/aplicadas, geração obrigatória via `drizzle-kit generate` e uso de `drizzle-seed` para seeds e factories de teste.
  - **Idioma (`pt-BR`):** Mensagens de validação, erros de domínio voltados ao usuário, textos de UI e descrições de casos de teste obrigatoriamente em português brasileiro.

### 2.2 Texto Completo Proposto para `.agents/CONSTITUTION.md`

````markdown
# CONSTITUIÇÃO DO PROJETO — ESTRADA+

> Versão: 2.0.0 · Stack: Nuxt 4 · TypeScript strict · @nuxt/ui v4 · Tailwind CSS v4 · Pinia · Drizzle ORM · SQLite (better-sqlite3) · Zod · Vitest · Playwright · k6
>
> Este documento é **normativo**. Vale para humanos e agentes de IA.
> Em caso de conflito com qualquer outra instrução (prompt, issue, comentário de PR, pedido verbal), **esta constituição prevalece**.

---

## 0. Como interpretar este documento

- **DEVE / NÃO DEVE** são obrigações absolutas. Não há exceção implícita.
- **DEVERIA** é a regra padrão: só se descumpre com justificativa registrada (ver §9).
- Uma tarefa **só está concluída** quando todos os gates da §3 passam, executados de verdade, na sua versão final do código. "Deve passar" ou "provavelmente passa" **não é** passar.
- O agente **NÃO DEVE** declarar uma tarefa como concluída, correta ou pronta sem apresentar a evidência (saída dos comandos) da §3.
- Dúvida sobre requisito, escopo ou regra: **pergunte** antes de assumir.

---

## 1. Princípios invioláveis

1. **Qualidade não é negociável por prazo.** Nenhum gate é pulado para "entregar mais rápido".
2. **Nunca enfraquecer o gate para fazer o código passar.** Corrija o código, não a régua (§9).
3. **Menor mudança que resolve o problema.** Sem refatorações oportunistas, sem escopo extra, sem dependências "por conveniência".
4. **Responsabilidade única (SRP).** Cada módulo, função, service, repository, componente e composable tem **um** motivo para mudar.
5. **DRY com bom senso.** Duplicação de _conhecimento_ é proibida; duplicação acidental de sintaxe é tolerada até a terceira ocorrência (regra dos três).
6. **Dependências fluem em uma direção.** Camadas são respeitadas e verificadas por ferramenta (`dependency-cruiser` + `test:arch`), não por boa vontade.
7. **Tipos são a primeira linha de defesa.** `any`, `@ts-ignore` e asserções `as` sem justificativa são defeitos.
8. **Código sem teste é código que não existe.** Todo comportamento novo ou alterado tem teste automatizado.
9. **Fail fast nas fronteiras.** Toda entrada externa é validada com schema Zod compartilhado em `shared/schemas/` antes de entrar no domínio, tanto na API quanto no front-end.
10. **Segurança e secrets** não são opcionais (§8).

---

## 2. Arquitetura e estrutura de dependências

### 2.1 Layout (Nuxt 4)

```text
app/                # código cliente/SSR (srcDir padrão do Nuxt 4)
  assets/           # CSS (Tailwind v4 + tokens Night Highway), fontes e ativos
  components/       # apresentação (@nuxt/ui v4); sem I/O ou fetch direto
  composables/      # lógica reativa reutilizável (useApiFetch, useTrips, etc.)
  pages/            # roteamento; composição fina de componentes e composables
  layouts/ middleware/ plugins/ stores/ types/ utils/
server/             # Nitro (Backend em 3 camadas estritas)
  api/ routes/      # Camada 1 — Endpoints FINOS: validar payload (Zod) → 1 service → resposta HTTP
  services/         # Camada 2 — Regras de negócio, cálculos e orquestração transacional
  repositories/     # Camada 3 — Único ponto de acesso a dados via Drizzle ORM
  database/         # Conexão better-sqlite3, schema Drizzle, migrations e seeds (drizzle-seed)
  utils/ middleware/ plugins/ types/
shared/             # código 100% isomórfico e puro compartilhado entre app/ e server/
  schemas/          # schemas Zod de entrada/saída compartilhados (API + UForm no front-end)
  types/            # tipos de domínio inferidos dos schemas (z.infer) e constantes/enums
  utils/            # funções puras de cálculo de telemetria e conversão de unidades
test/
  unit/ nuxt/ e2e/ arch/ load/
```
````

### 2.2 Regras de dependência (verificadas por `dependency-cruiser` e `test:arch`)

| De → Para                                                                 | Permitido?                                                      |
| ------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `app/**` → `shared/**`                                                    | ✅                                                              |
| `server/**` → `shared/**`                                                 | ✅                                                              |
| `server/api/**` → `server/services/**` e `server/utils/**`                | ✅                                                              |
| `server/services/**` → `server/repositories/**` e `server/utils/**`       | ✅                                                              |
| `server/repositories/**` → `server/database/**` e `drizzle-orm`           | ✅                                                              |
| `app/**` → `server/**`                                                    | ❌ (comunicação só via HTTP com `useApiFetch` / `$fetch`)       |
| `server/**` → `app/**`                                                    | ❌                                                              |
| `shared/**` → `app/**`, `server/**` ou Vue/Nuxt/Nitro/Node/Drizzle APIs   | ❌ (deve ser 100% puro e isomórfico)                            |
| `components/**` → `$fetch`/`useFetch`/`useAsyncData`/`useApiFetch` direto | ❌ (usar composable ou store)                                   |
| `pages/**` → `pages/**`                                                   | ❌                                                              |
| `server/api/**` → `server/repositories/**` ou `server/database/**` direto | ❌ (proibido pular `server/services/**`)                        |
| `server/services/**` → `server/database/client` ou `better-sqlite3`       | ❌ (acesso a dados exclusivamente via `server/repositories/**`) |
| `server/repositories/**` → `server/services/**` ou `server/api/**`        | ❌                                                              |
| `server/services/**` → `server/api/**`                                    | ❌                                                              |
| Qualquer ciclo de importação                                              | ❌                                                              |
| Módulo órfão (não importado por ninguém, fora de convenções do Nuxt)      | ❌                                                              |
| `dependencies` importando `devDependencies` em código de produção         | ❌                                                              |

### 2.3 Regras de design e banco de dados (Drizzle + SQLite)

- **Handler de API (`server/api/**`)** tem no máximo: verificar autenticação/sessão → validar entrada (`readValidatedBody`, `getValidatedQuery`, `getValidatedRouterParams` com schema Zod de `#shared/schemas/...`) → chamar **um** service → retornar resposta padronizada. Sem regra de negócio e sem queries.
- **Services (`server/services/**`)** concentram todas as regras de negócio, validações cruzadas de domínio e orquestração de repositórios; lançam `DomainError` tipado (nunca `createError` HTTP diretamente).
- **Repositories (`server/repositories/**`)** encapsulam 100% das queries Drizzle ORM. Nenhum outro diretório (exceto `server/database/**` na configuração/seed) pode importar `drizzle-orm` para executar queries.
- **Portabilidade de Schema e Migrations:**
  - O banco atual é SQLite (`better-sqlite3` em modo WAL com `foreign_keys = ON`), mas o schema em `server/database/schema.ts` **DEVE** ser mantido portável para futura migração a outro SGBD (ex.: PostgreSQL): valores monetários armazenados em centavos (`integer`), litragem em decilitros (`integer`), peso em quilogramas (`integer`), metas de consumo em milésimos de km/L (`integer`) e datas/timestamps em strings ISO-8601 (`text`).
  - Toda alteração de schema **DEVE** gerar migration versionada via `npm run db:generate` (`drizzle-kit generate`). É **proibido** editar manualmente arquivos SQL já commitados em `server/database/migrations/` ou usar `drizzle-kit push` em produção.
  - Seeds de desenvolvimento e factories de teste utilizam `drizzle-seed` (`npm run db:seed`).
- **Validação Isomórfica (Zod em `shared/schemas/`):**
  - Todo payload de entrada (create, update, query, params) possui schema Zod em `shared/schemas/` com mensagens de erro em **português (`pt-BR`)**.
  - O mesmo schema é utilizado pelo `UForm` no front-end e pelo handler em `server/api/`.
- **Componentes e Composables:**
  - Componentes recebem props e emitem eventos; lógica de busca/mutação fica em composables (`app/composables/use*.ts`) ou stores Pinia.
  - Para leitura SSR reativa no cliente, utilize `useApiFetch` com chave estável; para mutações imperativas (`POST`, `PUT`, `DELETE`), utilize `$fetch`.
- **Nada de estado global mutável no servidor** (exceto o singleton de conexão SQLite em `server/database/client.ts`).
- **Configuração** só via `runtimeConfig`; `process.env` fora de `nuxt.config.ts`, `drizzle.config.ts`, `playwright.config.ts` e `scripts/**` é proibido pelo ESLint.

---

## 3. DEFINITION OF DONE — Quality Gates

Uma tarefa está **CONCLUÍDA** se, e somente se, **todos** os gates abaixo passam com exit code `0`.

Comando único e canônico:

```bash
npm run quality
```

| #   | Gate                           | Comando                    | Critério de aprovação                                    |
| --- | ------------------------------ | -------------------------- | -------------------------------------------------------- |
| G1  | Formatação                     | `npm run format:check`     | 0 diferenças                                             |
| G2  | Lint                           | `npm run lint`             | 0 erros **e 0 warnings** (`--max-warnings 0`)            |
| G3  | Tipos                          | `npm run typecheck`        | `nuxt typecheck` (`vue-tsc`) com 0 erros, `strict: true` |
| G4  | Complexidade e tamanho         | (dentro do `npm run lint`) | Ver §4.1                                                 |
| G5  | Duplicação (DRY)               | `npm run dup:check`        | `jscpd` ≤ 3% de duplicação                               |
| G6  | Código morto / deps não usadas | `npm run unused:check`     | `knip` sem achados                                       |
| G7  | Estrutura de dependências      | `npm run deps:check`       | `dependency-cruiser` sem violações                       |
| G8  | Testes de arquitetura          | `npm run test:arch`        | 100% passando                                            |
| G9  | Testes unitários + integração  | `npm run test:coverage`    | 100% passando; cobertura ≥ limites da §5                 |
| G10 | Build                          | `npm run build`            | Build de produção sem erros e sem warnings relevantes    |
| G11 | Segurança de dependências      | `npm run audit:check`      | 0 vulnerabilidades `high`/`critical`                     |
| G12 | Secrets                        | `npm run secrets:check`    | 0 segredos detectados (`secretlint`)                     |
| G13 | E2E (fluxos tocados)           | `npm run test:e2e`         | 100% passando                                            |
| G14 | Carga (quando aplicável, §6)   | `npm run test:load:smoke`  | Thresholds do k6 atendidos                               |

### 3.1 Evidência obrigatória

Ao encerrar uma tarefa, o agente **DEVE** entregar:

1. Saída resumida de `npm run quality` (ou dos gates executados e o motivo de qualquer gate não aplicável).
2. Lista dos arquivos criados/alterados e **por quê**.
3. Testes adicionados/alterados e o comportamento que cada um cobre.
4. Qualquer desvio, risco ou débito técnico conhecido, explicitamente.

### 3.2 Quando um gate não se aplica

Só é aceitável pular G13/G14 se a mudança **comprovadamente** não toca fluxo de usuário / rota crítica (ex.: alteração exclusiva de documentação). O gate G14 (`npm run test:load:smoke`) requer servidor ativo e o binário `k6` instalado, sendo executado sob demanda conforme §6. Os gates G1–G12 **nunca** são dispensados.

---

## 4. Regras de código

### 4.1 Complexidade, tamanho e responsabilidade (erro no lint)

| Métrica                                   | Limite                                            | Ferramenta                     |
| ----------------------------------------- | ------------------------------------------------- | ------------------------------ |
| Complexidade ciclomática por função       | **≤ 10**                                          | `complexity` (ESLint)          |
| Complexidade cognitiva por função         | **≤ 15**                                          | `sonarjs/cognitive-complexity` |
| Linhas por função                         | **≤ 50** (sem comentários/linhas em branco)       | `max-lines-per-function`       |
| Linhas por arquivo `.ts`                  | **≤ 300**                                         | `max-lines`                    |
| Linhas por SFC `.vue` (script + template) | **≤ 250**                                         | `max-lines`                    |
| Profundidade de aninhamento               | **≤ 3**                                           | `max-depth`                    |
| Callbacks aninhados                       | **≤ 3**                                           | `max-nested-callbacks`         |
| Parâmetros por função                     | **≤ 4** (acima disso, objeto tipado)              | `max-params`                   |
| Props por componente                      | **≤ 8** (acima disso, reavaliar responsabilidade) | revisão                        |

### 4.2 TypeScript e Convenções de Nomenclatura / Idioma

- `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`, `exactOptionalPropertyTypes: true`.
- **Proibido:** `any` explícito, `@ts-ignore`, `@ts-nocheck`, `// eslint-disable` sem justificativa (§9), non-null assertion (`!`) sem comentário, `as unknown as T`.
- **Tipos de API e Formulários derivam dos schemas Zod** (`z.infer<typeof schema>` em `shared/`), nunca duplicados à mão.
- **Funções públicas** têm tipo de retorno explícito.
- **Idioma (`pt-BR`):** Textos de interface, mensagens de erro nos schemas Zod, mensagens de `DomainError` e descrições de testes (`describe`/`it`) **DEVEM** estar em português brasileiro (`pt-BR`).
- **Nomenclatura de arquivos:**
  - Componentes Vue: `PascalCase.vue`
  - Composables: `useCamelCase.ts`
  - Services: `<dominio>.service.ts`
  - Repositories: `<dominio>.repository.ts`
  - Schemas Zod: `<dominio>.schema.ts` em `shared/schemas/`

### 4.3 Vue / Nuxt / Tailwind CSS v4

- `<script setup lang="ts">` em todos os componentes, seguindo a ordem `<script>` → `<template>` → `<style>`.
- Props e emits tipados (`defineProps<…>()`, `defineEmits<…>()`), respeitando a ordem de macros (`defineOptions`, `defineModel`, `defineProps`, `defineEmits`, `defineSlots`).
- Sem mutação de props. Sem `v-html` com conteúdo não sanitizado.
- Sem lógica pesada no template; usar `computed`.
- Data fetching: `useApiFetch`/`useFetch`/`useAsyncData` com **chave estável**; nunca `$fetch` no `setup` raiz.
- Todo componente de página trata estados de **loading, erro e vazio**.
- Acessibilidade: elementos interativos semânticos, `alt` em imagens, labels em inputs (`vuejs-accessibility` no lint).
- Classes utilitárias do Tailwind CSS v4 validadas por `eslint-plugin-better-tailwindcss` e ordenadas pelo Prettier.

### 4.4 Estilo e legibilidade

- Nomes revelam intenção; sem abreviações obscuras.
- Funções pequenas e puras sempre que possível; efeitos colaterais isolados nas bordas.
- Early return em vez de `else` aninhado.
- Sem números/strings mágicos repetidos: extrair constante nomeada.
- Comentários explicam **por quê**, nunca **o quê**. Sem código comentado.
- Sem `console.log` em código de produção.

### 4.5 DRY

- `jscpd` bloqueia duplicação > 3% ou blocos ≥ 50 tokens / 6 linhas idênticos.
- Antes de criar helper, componente, composable ou tipo, **procurar se já existe** no repositório.

### 4.6 Tratamento de erros

- Erros de negócio são lançados pelos services via `DomainError` e mapeados para HTTP (`createError({ status, statusText, message, data })`) em um **único utilitário** (`server/utils/domain-error.ts`), sem vazar stack/detalhes de banco para o cliente.
- `statusText` deve conter apenas caracteres ASCII visíveis; descrições em `pt-BR` com acentuação vão na propriedade `message`.

---

## 5. Testes

### 5.1 Pirâmide

| Nível           | Ferramenta                                 | Local                        | O que cobre                                                                    |
| --------------- | ------------------------------------------ | ---------------------------- | ------------------------------------------------------------------------------ |
| Unitário / Repo | Vitest (`node`) + SQLite `:memory:`        | `test/unit/*.{test,spec}.ts` | funções puras, schemas Zod, services e repositories (contra SQLite em memória) |
| Nuxt/integração | Vitest + `@nuxt/test-utils` (`happy-dom`)  | `test/nuxt/*.{test,spec}.ts` | componentes, páginas, composables e endpoints com contexto Nuxt                |
| E2E             | Playwright + `@nuxt/test-utils/playwright` | `test/e2e/*.{test,spec}.ts`  | fluxos críticos de usuário                                                     |
| Arquitetura     | Vitest + `dependency-cruiser`              | `test/arch/*.{test,spec}.ts` | regras da §2, isolamento Drizzle/Zod e infraestrutura Docker                   |
| Carga           | k6                                         | `test/load/*.js`             | desempenho/limites (§6)                                                        |

### 5.2 Limites de cobertura (falha o gate se abaixo)

- **Global:** statements ≥ 80%, branches ≥ 75%, functions ≥ 80%, lines ≥ 80%.
- **Código novo/alterado:** ≥ 90% de linhas e branches.
- **`server/services/**`, `server/repositories/**` e `shared/**`:** ≥ 90% (statements, branches, functions e lines).
- Cobertura **nunca pode cair** em relação à `main`.

### 5.3 Regras de teste

- Todo bug corrigido começa com um teste que **falha** reproduzindo o bug.
- Testes são determinísticos: sem dependência de rede externa real, relógio real ou ordem de execução.
- Repositories são testados contra uma instância real do SQLite `:memory:` com migrations aplicadas e dados gerados por `drizzle-seed` (sem mockar o Drizzle nos testes de repository).
- Um comportamento por teste; nome em `pt-BR` descrevendo comportamento (`deve rejeitar viagem com km final menor ou igual ao inicial`).
- Padrão Arrange-Act-Assert. Sem lógica condicional ou loops dentro de teste.
- **Proibido:** `.only`, `.skip`/`.todo` sem issue vinculada, assertions vazias, testes que só "executam" código para inflar cobertura.

---

## 6. Testes de carga e desempenho

Obrigatórios para: novos endpoints em `server/api`, mudança em queries/repositórios, mudança em middleware global, rotas SSR críticas.

| Tipo      | Quando                         | Perfil                         | Thresholds                                                |
| --------- | ------------------------------ | ------------------------------ | --------------------------------------------------------- |
| **Smoke** | Todo PR que toque rota crítica | 1–5 VUs, 30–60 s               | `http_req_failed < 1%`, `p(95) < 500ms`                   |
| **Load**  | Antes de release / noturno     | carga esperada de pico, 10 min | `http_req_failed < 1%`, `p(95) < 800ms`, `p(99) < 1500ms` |

---

## 7. Dependências (pacotes)

- **Adicionar dependência é decisão arquitetural.** Antes de adicionar, o agente DEVE justificar: o que resolve, por que não dá para fazer com o que já existe, tamanho, manutenção, licença.
- Versões **fixas** (sem `^`/`~`) em `dependencies`; `package-lock.json` **sempre** commitado; instalação em CI com `npm ci`.
- Licenças permitidas: MIT, Apache-2.0, BSD, ISC.
- `knip` deve reportar zero dependências não usadas ou não declaradas.

---

## 8. Segurança

- **Nunca** commitar segredos, tokens, `.env` real ou arquivos `.db` locais. Gate G12 (`secretlint`).
- Toda entrada externa (body, query, params) é validada por schema (`zod`) no handler da API.
- Saída para HTML sempre escapada; `v-html` só com sanitização explícita.
- Cabeçalhos de segurança e rate limiting configurados via `nuxt-security` e utilitários de proteção nas rotas de autenticação.
- Senhas armazenadas exclusivamente com hash `scrypt` + salt aleatório (`node:crypto`); tokens de recuperação de senha armazenados com hash `SHA-256` e expiração curta.
- Autorização e vínculo do motorista (`driverId` da sessão) verificados **no servidor**, em todo endpoint protegido.
- Queries parametrizadas via Drizzle ORM; nunca concatenar SQL manual.

---

## 9. Proibido burlar os gates

O agente **NÃO DEVE**, sob nenhuma circunstância, para fazer um gate passar:

- Reduzir limites em `eslint.config.mjs`, `vitest.config.ts`, `.dependency-cruiser.cjs`, `.jscpd.json`, `knip.json`, `tsconfig.json`, `k6` thresholds ou neste documento.
- Adicionar arquivos/pastas a listas de ignore para escapar de verificação de código autoral.
- Usar `eslint-disable`, `@ts-ignore`, `@ts-nocheck`, `istanbul ignore`, `v8 ignore` ou `// jscpd:ignore` sem: (a) escopo mínimo, (b) motivo técnico escrito, (c) issue vinculada.
- Apagar ou desabilitar teste que falha.
- Usar `--no-verify`, `HUSKY=0`, `[skip ci]` ou equivalente.
- Alterar o script `quality` para remover gates.
- Declarar sucesso sem ter executado os comandos.

**Exceções** exigem registro em `docs/adr/` (ADR) aprovado por um mantenedor humano.

---

## 10. Protocolo do agente

### 10.1 Antes de codificar

1. Ler esta constituição (`.agents/CONSTITUTION.md`), `AGENTS.md` e a spec correspondente em `docs/raw_specs/`.
2. Entender o requisito; listar critérios de aceite. Se ambíguo, perguntar.
3. Mapear arquivos afetados e **buscar código existente reutilizável** (DRY).
4. Planejar em passos pequenos, indicando camadas tocadas (§2).

### 10.2 Durante

1. Escrever o teste primeiro (ou junto) para o comportamento novo.
2. Mudanças pequenas e incrementais; rodar `npm run check` com frequência.
3. Não alterar arquivos fora do escopo.

### 10.3 Antes de declarar concluído (checklist)

- [ ] `npm run quality` executado e **verde** (com saída anexada)
- [ ] Nenhum limite, ignore ou threshold foi afrouxado (§9)
- [ ] Testes novos cobrem sucesso, borda e erro
- [ ] Cobertura não caiu; código novo, `services`, `repositories` e `shared` ≥ 90%
- [ ] Sem `any`, `@ts-ignore`, `console.log`, código comentado ou TODO sem issue
- [ ] Nenhuma duplicação nova; busquei reuso antes de criar
- [ ] Regras de dependência da §2 respeitadas (`api` → `services` → `repositories` → `database`)
- [ ] Sem segredos; entradas externas validadas com schemas Zod compartilhados em `shared/schemas/`
- [ ] Documentação/ADR atualizados se houve decisão arquitetural
- [ ] Riscos e débitos conhecidos informados

---

## 11. Convenções de processo

- **Commits:** Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`), validados por `commitlint` no hook `commit-msg`.
- **PRs pequenos:** ≤ 400 linhas alteradas por padrão.
- **Hooks locais:** `pre-commit` roda `lint-staged`, `commit-msg` roda `commitlint` e `pre-push` roda `typecheck` + `test:unit`.
- **CI é a fonte da verdade:** `.github/workflows/quality.yml` executa `npm run quality` completo.

---

## 12. Emenda desta constituição

- Somente humanos mantenedores alteram este arquivo, via PR dedicado.
- Qualquer mudança incrementa a versão no cabeçalho e é registrada em `docs/adr/`.

````

---

## 3. Dependências

### 3.1 Tabela de Auditoria de Dependências

| Pacote | Tipo | Status Atual | Versão Atual / Proposta | Análise e Justificativa |
| :--- | :---: | :--- | :---: | :--- |
| `nuxt` | `dependencies` | ✅ Instalada e correta | `4.6.2` | Core do framework Nuxt 4 (com suporte a `nuxt/server`). |
| `vue` / `vue-router` | `dependencies` | ✅ Instalada e correta | `3.5.44` / `5.4.0` | Runtime Vue 3 e roteamento. |
| `@nuxt/ui` / `tailwindcss` / `@tailwindcss/vite` | `deps` / `devDeps` | ✅ Instalada e correta | `4.12.0` / `4.3.3` | Sistema de componentes acessíveis e estilização Tailwind CSS v4. |
| `@nuxt/fonts` / `@nuxt/icon` / `@iconify-json/lucide` / `@nuxt/image` | `dependencies` | ✅ Instalada e correta | `1.1.0` / `2.6.0` / `1.2.147` / `2.2.0` | Fontes (`Oswald`, `Inter`, `JetBrains Mono`), ícones Lucide e otimização de ativos. |
| `pinia` / `@pinia/nuxt` | `dependencies` | ✅ Instalada e correta | `4.1.0` / `1.0.3` | Gerenciamento de estado no cliente. |
| `zod` | `dependencies` | ✅ Instalada e correta | `4.6.7` | Validação isomórfica de schemas em `shared/schemas/` (compatível com Standard Schema no Nuxt 4 e `@nuxt/ui`). |
| `nuxt-security` | `dependencies` | ✅ Instalada e correta | `2.7.0` | Cabeçalhos HTTP de segurança, CORS e rate limiting. |
| `drizzle-orm` | `dependencies` | ❌ **Faltando** | `0.44.2` (fixa) | ORM TypeScript type-safe exigido pela stack para acesso a dados em `server/repositories/`. |
| `better-sqlite3` | `dependencies` | ❌ **Faltando** | `12.2.0` (fixa) | Driver SQLite nativo síncrono de alta performance para Node 24, com suporte a WAL e `:memory:` nos testes. |
| `nodemailer` | `dependencies` | ❌ **Faltando** | `7.0.3` (fixa) | Cliente SMTP padrão para envio do e-mail de recuperação de senha com Magic Link (`03-autenticacao`). |
| `drizzle-kit` | `devDependencies` | ❌ **Faltando** | `^0.31.1` | CLI para geração e inspeção de migrations SQL a partir de `server/database/schema.ts`. |
| `drizzle-seed` | `devDependencies` | ❌ **Faltando** | `^0.3.1` | Geração determinística de seeds de desenvolvimento e factories para testes automatizados. |
| `@types/better-sqlite3` | `devDependencies` | ❌ **Faltando** | `^7.6.13` | Definições de tipos TypeScript para o `better-sqlite3`. |
| `@types/nodemailer` | `devDependencies` | ❌ **Faltando** | `^6.4.17` | Definições de tipos TypeScript para o `nodemailer`. |
| `tsx` | `devDependencies` | ❌ **Faltando** | `^4.20.3` | Executor TypeScript para rodar `server/database/seed.ts` via script `npm run db:seed`. |
| `orval` | `devDependencies` | 🗑️ **Instalada e desnecessária** | `^8.44.0` (remover) | Gerador de cliente OpenAPI do template original; substituído pelos schemas Zod em `shared/schemas/` e rotas tipadas nativas do Nuxt 4. |
| `vitest` / `@vitest/coverage-v8` / `@nuxt/test-utils` / `@vue/test-utils` / `happy-dom` | `devDependencies` | ✅ Instalada e correta | `^5.0.5` / `^4.3.4` / `^2.5.1` / `^21.0.4` | Suíte de testes unitários, integração Nuxt, arquitetura e cobertura V8. |
| `@playwright/test` / `playwright-core` | `devDependencies` | ✅ Instalada e correta | `^1.64.1` | Testes E2E automatizados. |
| `eslint` / `@nuxt/eslint` / `eslint-plugin-sonarjs` / `eslint-plugin-vuejs-accessibility` / `eslint-plugin-better-tailwindcss` / `eslint-config-prettier` | `devDependencies` | ✅ Instalada e correta | Instaladas | Gates G2 e G4 de qualidade estática, complexidade e acessibilidade. |
| `dependency-cruiser` / `knip` / `jscpd` / `secretlint` / `husky` / `lint-staged` / `@commitlint/*` / `npm-run-all2` / `prettier` | `devDependencies` | ✅ Instalada e correta | Instaladas | Gates G1, G5, G6, G7, G12 e hooks de Git. |

### 3.2 Comandos Propostos de Remoção e Instalação

Conforme a §7 da Constituição, pacotes em `dependencies` **DEVEM** ser instalados com versão exata (`--save-exact`):

```bash
# 1. Remover dependência desnecessária do template (Orval)
npm uninstall orval

# 2. Instalar dependências de produção com versões fixas (--save-exact)
npm install --save-exact drizzle-orm better-sqlite3 nodemailer

# 3. Instalar dependências de desenvolvimento
npm install --save-dev drizzle-kit drizzle-seed @types/better-sqlite3 @types/nodemailer tsx
````

> [!NOTE]
> Como `better-sqlite3` utiliza bindings nativos/prebuilds, caso o `package.json` mantenha a chave `allowScripts`, adicionar `"better-sqlite3@<versao>": true` se necessário.

### 3.3 Scripts Atualizados no `package.json`

Remover `"api:generate": "orval && prettier --write shared/http"` e adicionar os scripts de banco de dados:

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "tsx server/database/migrate.ts",
    "db:seed": "tsx server/database/seed.ts",
    "db:studio": "drizzle-kit studio"
  }
}
```

---

## 4. Limpeza do Repositório

### 4.1 Tabela de Arquivos e Diretórios a Remover

| Caminho                                                           | Categoria                       | Justificativa Técnica                                                                                                  |                                                            Risco                                                             |
| :---------------------------------------------------------------- | :------------------------------ | :--------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------: |
| `openapi.json`                                                    | Resíduo Orval                   | Especificação OpenAPI de exemplo do scaffolding (`/health`); contratos passam a viver em `shared/schemas/*.schema.ts`. |                                       Baixo (atualizar `README.md` e `.env.example`).                                        |
| `orval.config.ts`                                                 | Resíduo Orval                   | Configuração do gerador Orval que será desinstalado.                                                                   |                                           Baixo (remover de `eslint.config.mjs`).                                            |
| `shared/http/` (`api.schemas.ts`, `index.ts`, `system/system.ts`) | Resíduo Orval                   | Código gerado pelo Orval; será substituído por `shared/schemas/` e `useApiFetch`.                                      |     Baixo (atualizar `app/pages/index.vue`, `knip.json`, `.jscpd.json`, `vitest.config.ts` e `.dependency-cruiser.cjs`).     |
| `shared/lib/client.ts`                                            | Resíduo Orval                   | Mutator exclusivo do cliente Orval (`customFetch`). O projeto utilizará `useApiFetch` e `$fetch` nativo do Nuxt 4.     | Baixo (remover testes unitários/nuxt que testavam especificamente o mutator do Orval: `test/unit/http/`, `test/nuxt/http/`). |
| `shared/utils/health-schema.ts`                                   | Reorganização                   | Será movido/padronizado para `shared/schemas/health.schema.ts` seguindo a convenção de `shared/schemas/`.              |                Baixo (atualizar import em `server/api/health.get.ts` e `server/services/health.service.ts`).                 |
| `app/stores/counter.ts` e `test/unit/counter.spec.ts`             | Resíduo de Template             | Store de contador de exemplo do scaffolding sem relação com o domínio Estrada+.                                        |                              Baixo (atualizar `app/pages/index.vue` e `test/e2e/home.spec.ts`).                              |
| `content/` (`content/README.md`)                                  | Diretório não usado             | O módulo `@nuxt/content` não é utilizado no projeto.                                                                   |                                                           Nenhum.                                                            |
| `layers/` (`layers/README.md`)                                    | Diretório não usado             | O projeto não utiliza Nuxt Layers.                                                                                     |                                                           Nenhum.                                                            |
| `modules/` (`modules/README.md`)                                  | Diretório não usado             | O projeto não define módulos locais customizados em `modules/`.                                                        |                                                           Nenhum.                                                            |
| `coverage/`, `playwright-report/`, `test-results/`, `.data/`      | Artefatos locais de build/teste | Diretórios gerados localmente que não devem residir na árvore limpa (já ignorados no `.gitignore`).                    |                                                           Nenhum.                                                            |

> [!NOTE]
> Os ADRs históricos em `docs/adr/0001-node-forge-upstream-advisory.md`, `0002-containerizacao-docker-producao.md` e `0003-clientes-e-schemas-orval-em-shared.md` **NÃO DEVEM** ser removidos, pois fazem parte do registro histórico de decisões arquiteturais; um novo ADR `0004-arquitetura-drizzle-sqlite-e-remocao-orval.md` deve ser adicionado na implementação registrando a transição para a v2.0.0 da Constituição.
> O arquivo `estrada-desktop.html` na raiz é mantido como referência visual até o término da implementação de todos os módulos.

---

## 5. Conteúdo Proposto para `README.md`, `.env.example` e `.gitignore`

### 5.1 `README.md` (Conteúdo Completo Proposto)

````markdown
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
| `npm run db:migrate`      | Aplica as migrations pendentes no banco SQLite configurado em `DATABASE_URL`           |
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
````

### 5.2 `.env.example` (Conteúdo Completo Proposto)

```ini
# =============================================================================
# ESTRADA+ | Configuração de Ambiente (.env.example)
# Copie este arquivo para .env e preencha os valores adequados ao ambiente.
# NUNCA commite o arquivo .env real no repositório (Gate G12 - secretlint).
# =============================================================================

# URL base pública da API interna consumida pelo front-end (runtimeConfig.public.apiBase)
NUXT_PUBLIC_API_BASE=/api

# URL pública da aplicação (usada para compor links absolutos, como o Magic Link de redefinição de senha)
NUXT_PUBLIC_APP_URL=http://localhost:3000

# Caminho do arquivo de banco de dados SQLite (better-sqlite3)
# Em desenvolvimento: ./.data/sqlite/estrada.db | Em produção Docker: /app/data/estrada.db
NUXT_DATABASE_URL=./.data/sqlite/estrada.db

# Segredo da aplicação Nuxt (MÍNIMO de 32 caracteres) utilizado pelo nuxt/server (useSession / deriveSecret)
# Gere um valor aleatório seguro em produção com: openssl rand -hex 32
NUXT_APP_SECRET=troque-este-segredo-em-producao-minimo-32-caracteres

# Configurações de servidor SMTP para envio de e-mail (Recuperação de senha via Magic Link)
# Em desenvolvimento, se NUXT_SMTP_HOST estiver vazio, o link será registrado em modo simulado/log seguro.
NUXT_SMTP_HOST=
NUXT_SMTP_PORT=587
NUXT_SMTP_USER=
NUXT_SMTP_PASS=
NUXT_SMTP_FROM="Estrada+ Telemetria <no-reply@estradamais.com.br>"

# Porta de exposição do servidor HTTP Nitro
PORT=3000
```

### 5.3 `.gitignore` (Conteúdo Completo Proposto)

```gitignore
# Nuxt dev/build outputs
.output
.data
.nuxt
.nitro
.cache
dist

# Node dependencies
node_modules

# Banco de dados SQLite e arquivos de paginação/WAL
*.db
*.db-wal
*.db-shm
*.sqlite
*.sqlite3
*.sqlite-wal
*.sqlite-shm

# Logs
logs
*.log

# Sistema operacional e IDEs
.DS_Store
.fleet
.idea
.vscode/*
!.vscode/extensions.json
!.vscode/settings.json

# Arquivos de ambiente locais (Segurança §8)
.env
.env.*
!.env.example

# Relatórios de testes e cobertura
playwright-report
test-results
coverage
```

> [!WARNING]
> O `.gitignore` atual continha `docs/` e `estrada-desktop.html` nas últimas linhas, o que impedia o versionamento das especificações em `docs/raw_specs/`. Na versão proposta acima, `docs/` deixa de ser ignorado e todos os artefatos de banco SQLite (`*.db`, `*.db-wal`, `*.db-shm`, `*.sqlite*`) passam a ser ignorados.

---

## 6. Docker

### 6.1 Avaliação dos Arquivos Atuais contra os Requisitos

| Requisito                                        | Estado Atual (`docker/prod/Dockerfile` e `docker-compose.prod.yml`)                                 | Problema Encontrado                                                                                                                                                                                                                                      | Correção Proposta                                                                                                                                                                                                                                   |
| :----------------------------------------------- | :-------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Build Multi-Stage**                            | Usa 2 estágios (`build` e `runner`) com `node:24-bookworm-slim`.                                    | `better-sqlite3` pode exigir ferramentas de compilação (`python3`, `make`, `g++`) no estágio `build` caso não haja binário pré-compilado para a combinação exata de Node/arquitetura, e o binário `.node` compilado precisa estar acessível no `runner`. | Instalar toolchain de build apenas no estágio `build` (se necessário), configurar `nitro.externals` / cópia do módulo nativo `better-sqlite3` para o `runner` sem levar `devDependencies`.                                                          |
| **Módulos Nativos do SQLite (`better-sqlite3`)** | Copia apenas `.output` e `package.json`.                                                            | O Nitro agrupa dependências JS em `.output/server/node_modules`, mas bindings C++ nativos (`.node` do `better-sqlite3`) podem falhar ao resolver o binário se não forem preservados corretamente no estágio `runner`.                                    | Garantir que `better-sqlite3` e `bindings`/`file-uri-to-path` estejam presentes em `.output/server/node_modules` (ou copiados do `node_modules` de produção enxuto) e validados no healthcheck do container.                                        |
| **Usuário Não-Root**                             | Usa `USER node`.                                                                                    | Não cria previamente o diretório `/app/data` com permissão `node:node` para o volume do SQLite. Quando o Docker monta o volume, o usuário `node` pode receber `EACCES: permission denied` ao criar `estrada.db`, `estrada.db-wal` e `estrada.db-shm`.    | Criar `/app/data` no `Dockerfile` com ` mkdir -p /app/data && chown -R node:node /app/data` antes de `USER node`.                                                                                                                                   |
| **Volume Persistente para o Banco**              | `docker-compose.prod.yml` não possui seção `volumes:`.                                              | Sem volume persistente, qualquer recriação do container apaga 100% das viagens, despesas e configurações do motorista.                                                                                                                                   | Adicionar volume nomeado `estrada_sqlite_data:/app/data` no `docker-compose.prod.yml` e definir `NUXT_DATABASE_URL=/app/data/estrada.db`.                                                                                                           |
| **Migrations no Start**                          | Não copia arquivos de migration nem executa migrations.                                             | A pasta `server/database/migrations` não está presente no estágio `runner`.                                                                                                                                                                              | Copiar `server/database/migrations` com `--chown=node:node` para `/app/server/database/migrations` no `runner` para que o Nitro Server Plugin (`01.database-migrate.ts`) execute `migrate()` automaticamente no boot sem precisar do `drizzle-kit`. |
| **Healthcheck**                                  | Verifica `http://localhost:3000/api/health`, que hoje retorna apenas `{ status: 'ok', timestamp }`. | Não verifica se o SQLite está acessível e com as migrations aplicadas.                                                                                                                                                                                   | Atualizar `HealthService` para executar `SELECT 1` via `HealthRepository` no SQLite e manter o `HEALTHCHECK` nativo com `fetch`.                                                                                                                    |
| **Variáveis de Ambiente**                        | Define apenas `NODE_ENV`, `NITRO_HOST`, `NITRO_PORT` e `NUXT_PUBLIC_API_BASE`.                      | Faltam `NUXT_DATABASE_URL`, `NUXT_APP_SECRET`, `NUXT_PUBLIC_APP_URL` e variáveis `NUXT_SMTP_*`.                                                                                                                                                          | Declarar todas as variáveis de ambiente necessárias no `docker-compose.prod.yml`.                                                                                                                                                                   |
| **`.dockerignore`**                              | Ignora `node_modules`, `.nuxt`, `.output`, `.env`, etc.                                             | Não ignora arquivos `*.db`, `*.db-wal`, `*.db-shm`, `*.sqlite*`, correndo o risco de copiar um banco local de desenvolvimento para dentro da imagem de build.                                                                                            | Adicionar `*.db`, `*.db-wal`, `*.db-shm`, `*.sqlite*`, `docs/` e `estrada-desktop.html` ao `.dockerignore`.                                                                                                                                         |
| **Tamanho da Imagem**                            | Baseada em `node:24-bookworm-slim`.                                                                 | Já é enxuta (~220 MB), pois não inclui navegadores do Playwright nem `devDependencies` no estágio `runner`.                                                                                                                                              | Manter `node:24-bookworm-slim` no `runner` copiando apenas `.output`, `package.json` e `server/database/migrations`.                                                                                                                                |

### 6.2 `docker/prod/Dockerfile` (Conteúdo Completo Proposto)

```dockerfile
# Stage 1: Build da aplicação Nuxt 4 / Nitro e compilação de addons nativos
FROM node:24-bookworm-slim AS build

WORKDIR /app

# Dependências de compilação apenas no stage de build para garantir suporte ao addon nativo better-sqlite3
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

RUN npm run build

# Stage 2: Runtime enxuto de produção
FROM node:24-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production \
    NITRO_HOST=0.0.0.0 \
    NITRO_PORT=3000 \
    NUXT_DATABASE_URL=/app/data/estrada.db

# Cria diretório de dados persistentes do SQLite (WAL) pertencente ao usuário não-root
RUN mkdir -p /app/data && chown -R node:node /app/data

COPY --from=build --chown=node:node /app/.output ./.output
COPY --from=build --chown=node:node /app/server/database/migrations ./server/database/migrations
COPY --from=build --chown=node:node /app/package.json ./package.json

USER node

VOLUME ["/app/data"]

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD ["node", "-e", "fetch('http://localhost:3000/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]

CMD ["node", ".output/server/index.mjs"]
```

### 6.3 `docker-compose.prod.yml` (Conteúdo Completo Proposto)

```yaml
services:
  app:
    image: sistemastvem/estrada-mais-web:latest
    build:
      context: .
      dockerfile: docker/prod/Dockerfile
    container_name: estrada-mais-prod
    ports:
      - '${PORT:-3000}:3000'
    env_file:
      - path: .env
        required: true
    environment:
      NODE_ENV: production
      NITRO_HOST: 0.0.0.0
      NITRO_PORT: 3000
      NUXT_PUBLIC_API_BASE: ${NUXT_PUBLIC_API_BASE:-/api}
      NUXT_PUBLIC_APP_URL: ${NUXT_PUBLIC_APP_URL:-http://localhost:3000}
      NUXT_DATABASE_URL: ${NUXT_DATABASE_URL:-/app/data/estrada.db}
      NUXT_APP_SECRET: ${NUXT_APP_SECRET}
      NUXT_SMTP_HOST: ${NUXT_SMTP_HOST:-}
      NUXT_SMTP_PORT: ${NUXT_SMTP_PORT:-587}
      NUXT_SMTP_USER: ${NUXT_SMTP_USER:-}
      NUXT_SMTP_PASS: ${NUXT_SMTP_PASS:-}
      NUXT_SMTP_FROM: ${NUXT_SMTP_FROM:-Estrada+ Telemetria <no-reply@estradamais.com.br>}
    volumes:
      - estrada_sqlite_data:/app/data
    healthcheck:
      test:
        [
          'CMD',
          'node',
          '-e',
          "fetch('http://localhost:3000/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))",
        ]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 15s
    restart: unless-stopped

volumes:
  estrada_sqlite_data:
    name: estrada_sqlite_data
```

### 6.4 `.dockerignore` (Conteúdo Completo Proposto)

```dockerignore
# Dependências e builds locais
node_modules
.nuxt
.output
.nitro
.cache
.data
dist

# Banco de dados SQLite local
*.db
*.db-wal
*.db-shm
*.sqlite
*.sqlite3
*.sqlite-wal
*.sqlite-shm

# Testes, relatórios e documentação
coverage
playwright-report
test-results
test
docs
estrada-desktop.html

# Controle de versão e ferramentas de editor/agente
.git
.gitignore
.husky
.agents
.idea
.fleet
.vscode
.DS_Store

# Logs
logs
*.log

# Arquivos de ambiente locais (segurança §8)
.env
.env.*
!.env.example
```

---

## 7. Gates de Verificação e Testes de Arquitetura

### 7.1 Revisão das Regras em `.dependency-cruiser.cjs`

Para garantir que a arquitetura de 3 camadas (`api` → `services` → `repositories` → `database`) e os schemas compartilhados em `shared/` sejam impostos por ferramenta sem brechas, o arquivo `.dependency-cruiser.cjs` deve conter as seguintes regras:

| Nome da Regra (`forbidden`) | De (`from`)                                                         | Para (`to`)                                                             | O que Impõe                                                                                                                                                                              |
| :-------------------------- | :------------------------------------------------------------------ | :---------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `no-circular`               | `{}`                                                                | `{ circular: true }`                                                    | Proíbe ciclos de importação em qualquer camada.                                                                                                                                          |
| `no-orphans`                | `{ orphan: true, pathNot: [...] }`                                  | `{}`                                                                    | Proíbe arquivos órfãos fora das convenções Nuxt.                                                                                                                                         |
| `app-not-to-server`         | `^app`                                                              | `^server`                                                               | Isola o front-end do código de servidor.                                                                                                                                                 |
| `server-not-to-app`         | `^server`                                                           | `^app`                                                                  | Isola o servidor do código Vue/cliente.                                                                                                                                                  |
| `shared-is-pure`            | `^shared`                                                           | `^(app\|server)\|drizzle-orm\|better-sqlite3\|vue\|nuxt\|#app\|#server` | Garante que `shared/` seja 100% puro e isomórfico.                                                                                                                                       |
| `api-via-services`          | `^server/(api\|routes)`                                             | `^server/(repositories\|database)`                                      | **Regra 1:** Endpoints não podem pular `services` para acessar `repositories` ou `database`.                                                                                             |
| `only-repos-access-drizzle` | `^(app\|shared\|server/(api\|routes\|services\|middleware\|utils))` | `^(server/database\|drizzle-orm\|better-sqlite3)`                       | **Regra 2:** Somente `server/repositories/**` (e `server/database/**` / `server/plugins/01.database-migrate.ts`) podem importar o Drizzle ORM, `better-sqlite3` ou `server/database/**`. |
| `services-not-to-api`       | `^server/services`                                                  | `^server/(api\|routes)`                                                 | Impede inversão de dependência de `services` para `api`.                                                                                                                                 |
| `repos-not-to-services`     | `^server/repositories`                                              | `^server/(services\|api\|routes)`                                       | Impede inversão de dependência de `repositories` para `services` ou `api`.                                                                                                               |
| `components-no-direct-io`   | `^app/components`                                                   | `^(app/pages\|app/composables/useApiFetch)`                             | Componentes visuais não fazem I/O direto; usam composables de domínio ou recebem via props.                                                                                              |
| `no-dev-deps-in-prod`       | `^(app\|server\|shared)` (exceto `server/database/seed.ts`)         | `dependencyTypes: ['npm-dev']`                                          | Impede uso de pacotes de desenvolvimento no bundle de produção.                                                                                                                          |

### 7.2 Revisão dos Testes de Arquitetura (`test/arch/layers.spec.ts` e `test/arch/docker.spec.ts`)

Além de rodar o `dependency-cruiser` sobre o código real, `test/arch/layers.spec.ts` deve incluir testes de **validação contratual estática** sobre os arquivos do repositório:

1. **Verificação de isolamento de camadas (`dependency-cruiser`):**
   - Executa `cruise(['app', 'server', 'shared'], depcruiseConfig)` e exige `summary.error === 0` e `summary.warn === 0`.
2. **Teste de regressão das regras com grafos sintéticos / validação de configuração:**
   - Verifica explicitamente a existência e os padrões regex das regras `api-via-services`, `only-repos-access-drizzle`, `repos-not-to-services`, `shared-is-pure` e `components-no-direct-io`.
3. **Verificação de uso obrigatório de Zod e `#shared/schemas/` nos handlers de entrada (`server/api/**`):**
   - Inspeciona todos os arquivos `*.post.ts`, `*.put.ts`, `*.patch.ts` em `server/api/` e verifica que todos importam de `#shared/schemas/` e invocam `readValidatedBody` (ou `getValidatedRouterParams`/`getValidatedQuery`).
4. **Verificação de proibição de schemas Zod duplicados fora de `shared/schemas/`:**
   - Inspeciona `app/**` e `server/**` garantindo que nenhum arquivo fora de `shared/schemas/**` declara `z.object(` diretamente (forçando que todos os schemas vivam em `shared/schemas/`).

### 7.3 Como Confirmar que Cada Gate Falha Quando a Regra é Violada (Cenários de Violação)

| Regra Arquitetural                                                | Cenário de Violação de Exemplo (Mutação de Teste)                                                                                    | Gate que DEVE Falhar e Mensagem Esperada                                                                                                                                                       |
| :---------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Endpoint → Service → Repository (sem pular camadas)**        | Em `server/api/trips/index.get.ts`, adicionar `import { tripRepository } from '#server/repositories/trip.repository'`                | `npm run deps:check` e `npm run test:arch` falham com `error api-via-services: server/api/trips/index.get.ts → server/repositories/trip.repository.ts`.                                        |
| **2. Só Repositories acessam o Drizzle / SQLite**                 | Em `server/services/trip.service.ts`, adicionar `import { db } from '#server/database/client'` ou `import { eq } from 'drizzle-orm'` | `npm run deps:check` e `npm run test:arch` falham com `error only-repos-access-drizzle: server/services/trip.service.ts → server/database/client.ts`.                                          |
| **3. Payloads validados com Zod na API**                          | Criar `server/api/trips/index.post.ts` usando `await readBody(event)` sem `readValidatedBody` e sem importar de `#shared/schemas/`   | `npm run test:arch` falha na asserção `todos os handlers POST/PUT/PATCH em server/api devem validar entrada com readValidatedBody e #shared/schemas/`.                                         |
| **4. Schemas compartilhados exclusivamente em `shared/schemas/`** | Em `app/components/trips/TripFormModal.vue` ou `server/api/trips/index.post.ts`, escrever `const localSchema = z.object({ ... })`    | `npm run test:arch` (e regra `no-restricted-syntax` no ESLint para `app/` e `server/`) falha proibindo declaração de `z.object` fora de `shared/schemas/`.                                     |
| **5. Componentes sem fetch direto**                               | Em `app/components/trips/TripsDataTable.vue`, chamar `await useApiFetch('/trips')` ou `$fetch('/api/trips')`                         | `npm run deps:check` (`components-no-direct-io`) e `npm run lint` (`no-restricted-globals` em `app/components/**` para `$fetch`/`useFetch`/`useAsyncData`/`useApiFetch`) falham imediatamente. |

---

## 8. Critérios de Aceite, Ordem de Execução e Pontos em Aberto

### 8.1 Critérios de Aceite (Checklist Verificável)

- [ ] `.agents/CONSTITUTION.md` atualizada para a versão `2.0.0` sem referências ao Orval e com as regras de Drizzle/SQLite, Zod compartilhado em `shared/schemas/` e camadas `api` → `services` → `repositories` → `database`.
- [ ] `orval` desinstalado; `openapi.json`, `orval.config.ts`, `shared/http/` e `shared/lib/client.ts` removidos.
- [ ] `drizzle-orm`, `better-sqlite3` e `nodemailer` instalados com versões exatas em `dependencies`; `drizzle-kit`, `drizzle-seed`, `@types/better-sqlite3`, `@types/nodemailer` e `tsx` instalados em `devDependencies`.
- [ ] Resíduos de template (`app/stores/counter.ts`, `test/unit/counter.spec.ts`, `content/`, `layers/`, `modules/`) removidos.
- [ ] `README.md`, `.env.example` e `.gitignore` atualizados exatamente conforme a Seção 5 (com `docs/` rastreado pelo Git e `*.db*` ignorados).
- [ ] `drizzle.config.ts`, `server/database/client.ts` (com `PRAGMA journal_mode = WAL;` e `PRAGMA foreign_keys = ON;`), `server/database/schema.ts`, `server/database/migrate.ts` e `server/plugins/01.database-migrate.ts` configurados.
- [ ] `docker/prod/Dockerfile`, `docker-compose.prod.yml` e `.dockerignore` atualizados conforme a Seção 6, passando em `test/arch/docker.spec.ts`.
- [ ] `.dependency-cruiser.cjs`, `eslint.config.mjs` e `test/arch/layers.spec.ts` atualizados com as regras da Seção 7, comprovando falha nos 5 cenários de violação e aprovação no estado íntegro.
- [ ] `.github/workflows/quality.yml` e `test/load/load.js` criados e funcionais.
- [ ] `npm run quality` executando do início ao fim com exit code `0`.

### 8.2 Ordem de Execução das Mudanças (na Fase de Implementação)

1. Atualizar `.gitignore`, `.dockerignore` e `.env.example` (e sincronizar `.env` local).
2. Executar a remoção do `orval` e instalação das novas dependências (`drizzle-orm`, `better-sqlite3`, `nodemailer`, `drizzle-kit`, `drizzle-seed`, `@types/*`, `tsx`).
3. Remover os arquivos obsoletos listados na Seção 4 (`openapi.json`, `orval.config.ts`, `shared/http/`, `shared/lib/`, `counter.ts`, `content/`, `layers/`, `modules/`).
4. Criar a estrutura base `shared/schemas/health.schema.ts`, `server/database/client.ts`, `server/database/schema.ts`, `server/database/migrate.ts`, `server/repositories/health.repository.ts` e atualizar o fluxo `/api/health` (`endpoint` → `service` → `repository` → `SQLite SELECT 1`).
5. Atualizar `.agents/CONSTITUTION.md`, `README.md` e criar o ADR `docs/adr/0004-arquitetura-drizzle-sqlite-e-remocao-orval.md`.
6. Atualizar `.dependency-cruiser.cjs`, `eslint.config.mjs`, `knip.json`, `.jscpd.json`, `vitest.config.ts` e os testes de arquitetura em `test/arch/layers.spec.ts` e `test/arch/docker.spec.ts`.
7. Atualizar `docker/prod/Dockerfile`, `docker-compose.prod.yml`, criar `test/load/load.js` e `.github/workflows/quality.yml`.
8. Executar `npm run quality` e validar que todos os gates G1–G13 passam com zero erros e zero warnings.

### 8.3 Pontos em Aberto

- **Política de retenção do arquivo `estrada-desktop.html`:** Mantido na raiz durante o desenvolvimento das etapas funcionais para consulta visual lado a lado; recomenda-se movê-lo para `docs/mockup/estrada-desktop.html` ou removê-lo apenas no encerramento do módulo `07-painel-principal-e-relatorios`.
