## 1. Versionamento e Configuração de Repositório / Worktrees

- [x] 1.1 Atualizar `.gitignore` removendo `docs/` e `estrada-desktop.html` e adicionando `.worktrees/`, `.worktrees/**` e artefatos SQLite (`*.db`, `*.db-wal`, `*.db-shm`, `*.sqlite`, `*.sqlite3`, `*.sqlite-wal`, `*.sqlite-shm`)
- [x] 1.2 Atualizar `.prettierignore` (adicionar `.worktrees` e `estrada-desktop.html` para preservar o mockup intacto) e `.secretlintignore` (adicionar `.worktrees/**`)
- [x] 1.3 Adicionar `'.worktrees/**'` na lista `ignores` de `eslint.config.mjs` sem alterar nenhuma outra regra ou threshold
- [x] 1.4 Preencher `openspec/config.yaml` com `context` e `rules` da stack Estrada+ (Nuxt 4, TypeScript strict, @nuxt/ui v4, Tailwind CSS v4, Pinia, Drizzle ORM + SQLite `better-sqlite3`, Zod 4, Vitest, Playwright, `pt-BR`, Conventional Commits)
- [x] 1.5 Rastrear e commitar `docs/raw_specs/`, `.agent/`, `openspec/config.yaml` e `estrada-desktop.html`

## 2. Tipos e Constantes Transversais

- [x] 2.1 Criar `shared/types/domain.ts` (100% puro e isomórfico) exportando `EXPENSE_CATEGORIES`, `ExpenseCategory`, `PAYMENT_METHODS`, `PaymentMethod`, `BRAZILIAN_STATES`, `BrazilianState` e `DomainErrorCode`
- [x] 2.2 Exportar em `shared/types/domain.ts` os tipos genéricos de resposta da API `ApiItemResponse<T>`, `ApiListResponse<T, M>` e `ApiSuccessResponse`

## 3. Conversores Numéricos Puros

- [x] 3.1 Criar `shared/utils/units.ts` com funções puras tipadas explicitamente usando `Math.round` e normalização de `-0`: `toCents`/`fromCents`, `toDeciliters`/`fromDeciliters`, `toKg`/`fromKg` e `toMilliKmL`/`fromMilliKmL`
- [x] 3.2 Garantir aderência estrita às regras de complexidade e tamanho do ESLint e ausência de duplicação (`jscpd`)

## 4. Erros de Domínio e Mapeamento HTTP

- [x] 4.1 Criar `server/utils/domain-error.ts` exportando `DomainError` com `code: DomainErrorCode` e mapeamento único dos 7 códigos (`VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `SERVICE_UNAVAILABLE`) para HTTP status e `statusMessage` ASCII curto
- [x] 4.2 Implementar `handleServiceError(error: unknown): never` em `server/utils/domain-error.ts` usando `createError` e `isError` de `'h3'`, preservando `H3Error` e retornando HTTP `500` genérico para erros desconhecidos sem vazar detalhes internos

## 5. Testes Unitários e Validação de Qualidade

- [x] 5.1 Criar `test/unit/units.spec.ts` em `pt-BR` cobrindo todas as conversões de `shared/utils/units.ts` (sucesso, imprecisões IEEE 754 como `19.99`, `0`, `-0`, negativos) e verificando as constantes de `shared/types/domain.ts`
- [x] 5.2 Criar `test/unit/domain-error.spec.ts` em `pt-BR` cobrindo `DomainError` e `handleServiceError` para todos os 7 `DomainErrorCode`, preservação de `H3Error` e encapsulamento seguro de `Error` genérico e valores não-Error em HTTP `500`
- [ ] 5.3 Executar `npm run quality` garantindo exit code `0` e cobertura ≥ 90% em `shared/**` e `server/**`
