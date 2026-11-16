## Context

O repositório `estrada_mais_web` nasceu de um scaffolding Nuxt 4 com gates de qualidade rigorosos (`eslint`, `prettier`, `vue-tsc`, `dependency-cruiser`, `jscpd`, `knip`, `vitest`, `playwright`, `audit-check`, `secretlint`) e possui as especificações brutas em `docs/raw_specs/`, além dos workflows e skills OpenSpec em `.agent/` e `openspec/`.

Atualmente:

- `.gitignore` ignora `docs/` e `estrada-desktop.html`, impedindo que worktrees e novas branches herdem as especificações e o mockup de referência, e não ignora artefatos locais do SQLite (`*.db*`, `*.sqlite*`) nem `.worktrees/`.
- `.prettierignore`, `.secretlintignore` e `eslint.config.mjs` ainda não excluem `.worktrees` / `.worktrees/**`.
- `openspec/config.yaml` contém apenas o template padrão sem contexto da stack Estrada+.
- Ainda não existem os tipos transversais (`shared/types/domain.ts`), os conversores de precisão numérica por inteiros escalados (`shared/utils/units.ts`) nem o mapeador centralizado de erros de domínio para HTTP (`server/utils/domain-error.ts`).

Restrições normativas (`.agents/CONSTITUTION.md`):

- `shared/**` deve permanecer 100% puro e isomórfico (zero imports de `app/`, `server/`, Vue, Nuxt, Nitro ou APIs Node).
- `shared/**` e `server/**` exigem cobertura ≥ 90% em `vitest` (`unit` + `nuxt`).
- `eslint --max-warnings 0`, `vue-tsc` (`strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`), `knip` e `dependency-cruiser` devem passar sem afrouxar limites ou regras.

## Goals / Non-Goals

**Goals:**

- Garantir que todas as branches e worktrees futuras herdem `docs/raw_specs/`, `.agent/`, `openspec/` e `estrada-desktop.html`, mantendo `.worktrees/` e bancos SQLite locais devidamente ignorados.
- Documentar o contexto e regras da stack Estrada+ em `openspec/config.yaml`.
- Disponibilizar constantes e tipos de domínio compartilhados (`EXPENSE_CATEGORIES`, `PAYMENT_METHODS`, `BRAZILIAN_STATES`, `DomainErrorCode`, contratos `ApiItemResponse`, `ApiListResponse`, `ApiSuccessResponse`) em `shared/types/domain.ts`.
- Disponibilizar funções puras determinísticas de conversão em `shared/utils/units.ts` eliminando imprecisões IEEE 754 via `Math.round`.
- Disponibilizar `DomainError` e `handleServiceError` em `server/utils/domain-error.ts` com mapeamento único de `DomainErrorCode` → HTTP status + `statusMessage` ASCII curto e fallback seguro `500` sem vazamento de detalhes internos.
- Cobrir 100% dos novos utilitários com testes unitários determinísticos em `pt-BR`.

**Non-Goals:**

- Instalação de Drizzle ORM / `better-sqlite3`, remoção do Orval, atualização da `.agents/CONSTITUTION.md` para v2.0.0 ou endurecimento de regras Drizzle no `.dependency-cruiser.cjs` (escopo explícito de `01-configuracao-projeto`).
- Implementação de schemas Zod específicos de formulário/endpoint, páginas Vue, endpoints de negócio ou tabelas do banco (escopo de `02` a `08`).

## Decisions

### 1. Identificador da change OpenSpec (`spec-00-overview`)

- **Decisão:** Utilizar `spec-00-overview` como identificador da change no CLI OpenSpec em vez de `00-overview`.
- **Motivação:** O CLI `openspec` (v1.5.0) valida o nome da change com o padrão `/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/`, rejeitando nomes iniciados por dígito (`Change name must start with a letter`). O prefixo `spec-` preserva a rastreabilidade direta com `docs/raw_specs/00-overview.md` e mantém compatibilidade integral com todos os subcomandos `openspec`.
- **Alternativas consideradas:** Criar a pasta `00-overview` manualmente ignorando o CLI (descartado porque `openspec status` e `openspec instructions` também validam o nome e falhariam).

### 2. Import explícito de `h3` em `server/utils/domain-error.ts`

- **Decisão:** Importar `createError` e `isError` explicitamente de `'h3'` em `server/utils/domain-error.ts` e passar `{ statusCode, statusMessage, message, data }` para `createError`.
- **Motivação:** Embora o Nitro forneça auto-import de `createError` em runtime, a suíte unitária do Vitest (`project: 'unit'`, `environment: 'node'`) executa módulos de `server/` diretamente em Node sem o pipeline de auto-import do Nitro. Como `.nuxt/tsconfig.json` já mapeia `'h3'` para `node_modules/h3`, o `knip`, `nuxt typecheck`, `dependency-cruiser` e `vitest` resolvem `'h3'` nativamente sem stubs globais frágeis e sem alterar `package.json`. Além disso, em `h3@1.15.11`, `createError` aceita `statusCode`/`statusMessage` diretamente na tipagem `Partial<H3Error>` e define `err.statusCode` / `err.statusMessage` sem warning de sanitização quando `statusMessage` usa texto ASCII curto.
- **Alternativas consideradas:** Depender de `globalThis.createError` via auto-import e mockar nos testes (descartado por exigir stub global de algo pertencente ao framework e dificultar testes reais de `H3Error`); passar `status`/`statusText` (internamente `h3` apenas converte para `statusCode`/`statusMessage`).

### 3. Precisão numérica por inteiros escalados com `Math.round` e normalização de `-0`

- **Decisão:** Todas as conversões de entrada (`toCents`, `toDeciliters`, `toKg`, `toMilliKmL`) usam `Math.round(value * FACTOR)` com normalização `=== 0 ? 0 : result` para evitar `-0` em JavaScript; conversões de saída (`fromCents`, `fromDeciliters`, `fromKg`, `fromMilliKmL`) dividem pelo mesmo fator usando uma função auxiliar interna parametrizada por escala para eliminar duplicação (DRY / `jscpd`).
- **Motivação:** Em IEEE 754, `19.99 * 100 === 1998.9999999999998`, e `Math.round(-0.001)` retorna `-0`. Normalizar `-0` para `0` e centralizar a lógica por fator evita bugs sutis em comparações `Object.is` (`toBe(0)` no Vitest) e mantém cada função pública com assinatura explícita e complexidade mínima.
- **Alternativas consideradas:** Usar `Math.trunc` ou `Math.floor` (descartado porque `19.99 * 100` truncaria para `1998`, gerando perda de 1 centavo).

### 4. Preservação de `estrada-desktop.html` no Prettier

- **Decisão:** Verificar se `estrada-desktop.html` já atende `prettier --check` antes de decidir por adicioná-lo ao `.prettierignore`. Como o arquivo já passa integralmente em `prettier --check`, apenas `.worktrees` será adicionado ao `.prettierignore` (evitando entradas de ignore desnecessárias).
- **Alternativas consideradas:** Adicionar `estrada-desktop.html` ao `.prettierignore` preventivamente (desnecessário porque o arquivo já está formatado conforme o `.prettierrc` do projeto e permanece inalterado).

## Risks / Trade-offs

- **Risco:** `knip` sinalizar exports de `shared/types/domain.ts`, `shared/utils/units.ts` ou `server/utils/domain-error.ts` caso não sejam consumidos em `app/`/`server/` ainda → **Mitigação:** `knip.json` já inclui `shared/**/*.ts` e `server/**/*.ts` em `entry`, além de os arquivos de teste em `test/unit/*.spec.ts` importarem os exports; validar explicitamente com `npm run quality`.
- **Risco:** `estrada-desktop.html` ou `docs/raw_specs/` conterem segredos falsos positivos no `secretlint` ou quebrarem `format:check` após deixarem de ser ignorados no `.gitignore` → **Mitigação:** Executar `npm run quality` completo (incluindo `format:check` e `secrets:check`) antes de concluir e arquivar a change.
