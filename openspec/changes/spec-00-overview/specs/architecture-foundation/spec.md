## ADDED Requirements

### Requirement: Rastreamento de especificações e isolamento de worktrees

O repositório SHALL manter rastreados pelo Git os diretórios `docs/`, `.agent/`, `openspec/` e o arquivo `estrada-desktop.html`, ignorando `.worktrees/` e artefatos locais de banco SQLite (`*.db`, `*.db-wal`, `*.db-shm`, `*.sqlite`, `*.sqlite3`, `*.sqlite-wal`, `*.sqlite-shm`), bem como isolando `.worktrees` nas verificações do Prettier, Secretlint e ESLint sem afrouxar regras ou limites aplicáveis ao código autoral.

#### Scenario: Arquivos de governança e especificações disponíveis para novas branches

- **WHEN** `.gitignore` é atualizado removendo `docs/` e `estrada-desktop.html` e adicionando `.worktrees` e padrões SQLite
- **THEN** `git status` permite rastrear `docs/raw_specs/`, `.agent/`, `openspec/` e `estrada-desktop.html` enquanto ignora `.worktrees/` e arquivos `*.db*` / `*.sqlite*`

#### Scenario: Worktrees isoladas das ferramentas de verificação estática

- **WHEN** os scripts de formatação, lint e detecção de segredos são executados na raiz do workspace
- **THEN** `.prettierignore` (incluindo `.worktrees` e `estrada-desktop.html` para preservar o mockup original), `.secretlintignore` e `eslint.config.mjs` ignoram `.worktrees` sem alterar nenhuma regra, threshold ou lista de código autoral

#### Scenario: Contexto do OpenSpec configurado para o Estrada+

- **WHEN** `openspec/config.yaml` é consultado pelo fluxo OpenSpec
- **THEN** apresenta `context` e `rules` descrevendo Nuxt 4, TypeScript strict, @nuxt/ui v4, Tailwind CSS v4, Pinia, Drizzle ORM + SQLite (`better-sqlite3`), Zod 4, Vitest, Playwright, idioma `pt-BR` e Conventional Commits

### Requirement: Constantes e contratos compartilhados de domínio

O módulo `shared/types/domain.ts` SHALL exportar, sem qualquer dependência de `app/`, `server/`, Vue, Nuxt, Nitro ou APIs Node, as listas constantes e os tipos derivados `EXPENSE_CATEGORIES`/`ExpenseCategory`, `PAYMENT_METHODS`/`PaymentMethod`, `BRAZILIAN_STATES`/`BrazilianState`, o tipo `DomainErrorCode` e os contratos genéricos de resposta `ApiItemResponse<T>`, `ApiListResponse<T, M>` e `ApiSuccessResponse`.

#### Scenario: Categorias de despesa e meios de pagamento padronizados

- **WHEN** um consumidor em `app/` ou `server/` importa `EXPENSE_CATEGORIES` e `PAYMENT_METHODS` de `shared/types/domain.ts`
- **THEN** obtém respectivamente os 6 códigos de categoria (`combustivel`, `pedagio`, `borracharia`, `manutencao`, `alimentacao`, `outros`) e os 5 meios de pagamento (`cartao_frota`, `cartao_debito`, `pix`, `dinheiro`, `boleto`)

#### Scenario: Unidades federativas brasileiras completas

- **WHEN** um consumidor importa `BRAZILIAN_STATES`
- **THEN** obtém exatamente as 27 siglas oficiais das unidades federativas brasileiras (`AC` a `TO`) sem duplicatas

#### Scenario: Isolamento arquitetural da camada compartilhada

- **WHEN** o `dependency-cruiser` analisa `shared/types/domain.ts` e `shared/utils/units.ts`
- **THEN** nenhuma importação aponta para `app/`, `server/`, Vue, Nuxt, Nitro ou Node

### Requirement: Conversões numéricas puras em inteiros escalados

O módulo `shared/utils/units.ts` SHALL fornecer funções puras tipadas explicitamente para converter entre valores decimais de interface e inteiros escalados persistidos no banco, aplicando `Math.round` para eliminar erros de ponto flutuante IEEE 754 e normalizando `-0` para `0`:

- `toCents(reais)` / `fromCents(cents)` com fator `100`
- `toDeciliters(liters)` / `fromDeciliters(deciliters)` com fator `10`
- `toKg(tons)` / `fromKg(kg)` com fator `1000`
- `toMilliKmL(kmPerLiter)` / `fromMilliKmL(milliKmL)` com fator `1000`

#### Scenario: Conversão exata de valores monetários sujeitos a imprecisão IEEE 754

- **WHEN** `toCents(19.99)` e `toCents(3465.6)` são executados
- **THEN** retornam exatamente `1999` e `346560`, e `fromCents(1999)` retorna `19.99`

#### Scenario: Conversão de volume, peso e eficiência energética

- **WHEN** `toDeciliters(722.0)`, `toKg(32.4)` e `toMilliKmL(2.35)` são executados
- **THEN** retornam respectivamente `7220`, `32400` e `2350`, e suas funções inversas `fromDeciliters`, `fromKg` e `fromMilliKmL` retornam `722`, `32.4` e `2.35`

#### Scenario: Normalização de zero e suporte a valores negativos

- **WHEN** as funções de conversão recebem `0`, `-0` ou valores negativos como `-19.99`
- **THEN** `-0` é normalizado para `0` positivo e valores negativos preservam o sinal com arredondamento simétrico consistente

### Requirement: Erros de domínio tipados e mapeamento HTTP centralizado

O módulo `server/utils/domain-error.ts` SHALL exportar a classe `DomainError` (com `code: DomainErrorCode` e `message: string`) e a função `handleServiceError(error: unknown): never`, mapeando exclusivamente na borda HTTP cada `DomainErrorCode` para o status HTTP e `statusMessage` ASCII curto correspondentes via `createError` do `h3`, preservando erros `H3Error` já construídos e encapsulando qualquer outro erro desconhecido como HTTP `500` sem vazar detalhes internos ou stack traces.

#### Scenario: Mapeamento determinístico de todos os códigos de erro de domínio

- **WHEN** `handleServiceError` recebe um `DomainError` para qualquer um dos códigos `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED` ou `SERVICE_UNAVAILABLE`
- **THEN** lança um `H3Error` com `statusCode` (`400`, `401`, `403`, `404`, `409`, `429` ou `503`), `statusMessage` ASCII curto (`Bad Request`, `Unauthorized`, `Forbidden`, `Not Found`, `Conflict`, `Too Many Requests` ou `Service Unavailable`), `message` original em `pt-BR` e `data: { code }`

#### Scenario: Proteção contra vazamento de erros internos ou de banco

- **WHEN** `handleServiceError` recebe um `Error` genérico (ex.: `new Error('SQLITE_ERROR: leak')`) ou um valor não-Error
- **THEN** lança um `H3Error` com `statusCode: 500`, `statusMessage: 'Internal Server Error'` e `message: 'Ocorreu um erro interno inesperado.'`, sem expor a mensagem ou stack original

#### Scenario: Preservação de erros HTTP já formatados pelo H3

- **WHEN** `handleServiceError` recebe um `H3Error` já criado anteriormente (ex.: erro 400 de validação de entrada)
- **THEN** relança a instância original de `H3Error` sem sobrescrever seu status ou payload
