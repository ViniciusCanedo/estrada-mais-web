## Why

As rotas operacionais (`/`, `/trips`, `/expenses`, `/settings`) e o shell Night Highway já estão estruturados no Estrada+, mas ainda operam sem controle de acesso real, exibindo perfil estático na Sidebar e sem fluxo de login, proteção contra força bruta ou recuperação de senha. Esta mudança implementa o módulo completo de autenticação do motorista autônomo com sessão selada em cookie `httpOnly`, rate limiting em memória, recuperação via Magic Link por e-mail e proteção global de rotas.

## What Changes

- Criar os schemas Zod compartilhados em `shared/schemas/auth.schema.ts` (`loginSchema`, `forgotPasswordSchema`, `resetPasswordSchema`, `sessionUserSchema` e `logoutQuerySchema`) com mensagens em `pt-BR`.
- Implementar utilitários de servidor em `server/utils/rate-limiter.ts` (janela deslizante em memória para `login` e `forgot-password` com `resetRateLimitForTests()`) e `server/utils/session.ts` (sessão selada via `useSession` do `h3` com cookie `httpOnly`, `sameSite: 'lax'`, `maxAge` de 7 dias e `secure` adaptativo para HTTPS vs. HTTP local).
- Implementar os repositórios `server/repositories/driver.repository.ts` e `server/repositories/password-reset.repository.ts`, e o serviço `server/services/auth.service.ts` (autenticação com mitigação de enumeração em tempo equivalente via `scrypt`, perfil de sessão com iniciais e resumo do veículo, geração de Magic Link SHA-256 com expiração de 30 minutos e redefinição de senha de uso único).
- Criar os endpoints `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/forgot-password` e `POST /api/auth/reset-password`, além de atualizar `GET /api/health` para repassar o `driverId` da sessão ativa e popular `navigationCounts` reais.
- Criar o layout `app/layouts/auth.vue`, o composable `app/composables/useAuthSession.ts`, o middleware global `app/middleware/auth.global.ts` e as páginas públicas `app/pages/login.vue`, `app/pages/forgot-password.vue` e `app/pages/reset-password.vue` usando `UForm`, integrando `app/layouts/default.vue` e `app/components/layout/AppSidebar.vue` com dados reais da sessão e ação `Desconectar`.
- Adicionar cobertura completa de testes unitários, Nuxt e E2E (Playwright com seed idempotente e sessões autenticadas).

## Capabilities

### New Capabilities

- `authentication`: Autenticação por e-mail e senha com `scrypt`, sessão selada via `useSession` (`nuxt-session`), rate limiting em janela deslizante para login e recuperação de senha, fluxo de Magic Link de uso único com token SHA-256, proteção global de rotas no cliente/SSR e integração do perfil e logout na Sidebar.

### Modified Capabilities

<!-- Nenhuma capacidade existente em openspec/specs/ tem seus requisitos alterados nesta mudança -->

## Non-Goals

- Edição de dados cadastrais, alteração de senha autenticada ou metas de consumo na tela `/settings` (escopo da spec `04-configuracoes-e-perfil`).
- Autenticação multi-fator (MFA), OAuth social ou múltiplos papéis/permissões (sistema voltado ao motorista autônomo TAC).
- Armazenamento distribuído (Redis) para rate limiting nesta fase (janela deslizante em memória no processo Nitro).

## Impact

- Contratos compartilhados: `shared/schemas/auth.schema.ts`.
- Servidor (`server/`): `server/utils/rate-limiter.ts`, `server/utils/session.ts`, `server/repositories/driver.repository.ts`, `server/repositories/password-reset.repository.ts`, `server/services/auth.service.ts`, `server/api/auth/*.ts` e `server/api/health.get.ts`.
- Front-end (`app/`): `app/layouts/auth.vue`, `app/composables/useAuthSession.ts`, `app/middleware/auth.global.ts`, `app/pages/login.vue`, `app/pages/forgot-password.vue`, `app/pages/reset-password.vue`, `app/layouts/default.vue` e `app/components/layout/AppSidebar.vue`.
- Testes e configuração E2E: `playwright.config.ts`, `test/e2e/helpers/auth.ts`, `test/e2e/auth.spec.ts`, `test/e2e/home.spec.ts`, `test/e2e/navigation.spec.ts`, `test/nuxt/auth-pages.spec.ts`, `test/nuxt/layout.spec.ts`, `test/nuxt/index.spec.ts` e `test/unit/*.spec.ts`.
