## Why

O projeto Estrada+ parte de um scaffolding genérico e precisa consolidar sua fundação arquitetural transversal antes dos módulos de configuração, autenticação e domínio. Sem padronizar o versionamento de especificações/worktrees, os tipos e enums de domínio compartilhados, os conversores numéricos em inteiros escalados e o mapeamento centralizado de erros HTTP, os módulos subsequentes duplicariam contratos, sofreriam erros de ponto flutuante IEEE 754 e propagariam falhas internas sem padronização.

## What Changes

- Ajustar regras de versionamento e ferramentas (`.gitignore`, `.prettierignore`, `.secretlintignore`, `eslint.config.mjs`) para rastrear `docs/`, `.agent/`, `openspec/` e `estrada-desktop.html`, isolar `.worktrees/` e ignorar artefatos SQLite locais (`*.db*`, `*.sqlite*`).
- Configurar `openspec/config.yaml` com o contexto e regras da stack Estrada+ (Nuxt 4, TypeScript strict, @nuxt/ui v4, Tailwind CSS v4, Pinia, Drizzle ORM + SQLite `better-sqlite3`, Zod 4, Vitest, Playwright, `pt-BR`, Conventional Commits).
- Criar `shared/types/domain.ts` com enums/constantes de domínio (`EXPENSE_CATEGORIES`, `PAYMENT_METHODS`, `BRAZILIAN_STATES`, `DomainErrorCode`) e contratos genéricos de resposta da API (`ApiItemResponse`, `ApiListResponse`, `ApiSuccessResponse`).
- Criar `shared/utils/units.ts` com conversores numéricos puros e determinísticos por inteiros escalados (`toCents`/`fromCents`, `toDeciliters`/`fromDeciliters`, `toKg`/`fromKg`, `toMilliKmL`/`fromMilliKmL`).
- Criar `server/utils/domain-error.ts` com a classe `DomainError` e o mapeador único `handleServiceError` para `createError` do `h3`/Nitro com `statusText` ASCII curto e mensagem segura em `pt-BR`.
- Adicionar testes unitários em `test/unit/units.spec.ts` e `test/unit/domain-error.spec.ts` cobrindo precisão numérica, fronteiras e mapeamento completo de erros.

## Capabilities

### New Capabilities

- `architecture-foundation`: Fundação transversal do Estrada+, incluindo rastreamento de especificações e isolamento de worktrees, constantes e contratos compartilhados de domínio, utilitários de precisão numérica por inteiros escalados e mapeamento centralizado de erros de domínio para HTTP.

### Modified Capabilities

<!-- Nenhuma capacidade existente alterada -->

## Impact

- Arquivos de configuração e governança: `.gitignore`, `.prettierignore`, `.secretlintignore`, `eslint.config.mjs`, `openspec/config.yaml`.
- Código compartilhado puro: `shared/types/domain.ts`, `shared/utils/units.ts`.
- Utilitários de servidor Nitro: `server/utils/domain-error.ts`.
- Suíte de testes unitários: `test/unit/units.spec.ts`, `test/unit/domain-error.spec.ts`.
- Nenhuma alteração de dependências externas em `package.json` (a instalação de Drizzle/SQLite e remoção do Orval pertence ao módulo `01-configuracao-projeto`).
