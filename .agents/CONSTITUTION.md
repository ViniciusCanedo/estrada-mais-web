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
- **Configuração** só via `runtimeConfig`; `process.env` fora de `nuxt.config.ts`, `drizzle.config.ts`, `playwright.config.ts`, `scripts/**`, `server/database/migrate.ts` e `server/database/seed.ts` é proibido pelo ESLint.

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
- Cabeçalhos de segurança e CORS configurados explicitamente via módulo `nuxt-security`.
- Rate limiting em endpoints públicos e de autenticação.
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
