## 1. Schemas Zod Compartilhados

- [x] 1.1 Criar `shared/schemas/auth.schema.ts` com `loginSchema`, `forgotPasswordSchema`, `resetPasswordSchema`, `sessionUserSchema` e `logoutQuerySchema` (com normalização de e-mail em Zod 4 e mensagens em `pt-BR`)

## 2. Utilitários de Servidor (Rate Limiter e Sessão)

- [x] 2.1 Implementar `server/utils/rate-limiter.ts` com janela deslizante em memória (`login` = máx 5 falhas/15 min por `ip + email`, `forgot` = máx 3 solicitações/15 min por `ip`), formatação de tempo restante em `pt-BR` e `resetRateLimitForTests()`
- [x] 2.2 Implementar `server/utils/session.ts` encapsulando `useSession`/`clearSession` (`h3`) com cookie `nuxt-session` (`httpOnly`, `sameSite: 'lax'`, `maxAge: 604800`, `secure` para HTTPS), segredo via `runtimeConfig.appSecret` (com fallback dev/test seguro contra `secretlint`) e helpers `getSessionDriverId`, `requireAuthenticatedDriverId`, `setDriverSession` e `clearDriverSession`

## 3. Repositories e Service de Autenticação

- [x] 3.1 Implementar `server/repositories/driver.repository.ts` (`findByEmail`, `findById`, `updatePasswordHash`) e `server/repositories/password-reset.repository.ts` (`invalidatePendingByDriver`, `createToken`, `findValidByHash`, `markAsUsed`)
- [x] 3.2 Implementar `server/services/auth.service.ts` (`formatDriverSummary`, `computeInitials`, `authenticate` com mitigação de enumeração via `scrypt` dummy, `getSessionProfile`, `requestPasswordReset` com token SHA-256 de 32 bytes/30 min e `resetPassword` de uso único)

## 4. Endpoints HTTP

- [x] 4.1 Implementar `server/api/auth/login.post.ts`, `logout.post.ts`, `me.get.ts`, `forgot-password.post.ts` e `reset-password.post.ts` com validação Zod via `#shared/schemas/auth.schema` e mapeamento `handleServiceError`
- [x] 4.2 Atualizar `server/api/health.get.ts` para ler `getSessionDriverId(event)` e repassar `driverId` opcional a `healthService.getHealthStatus`

## 5. Front-end: Layout Auth, Middleware, Composable, Páginas e Sidebar

- [x] 5.1 Criar `app/layouts/auth.vue` no tema Night Highway (`#141416`, card `#1d1d20` com borda âmbar, `AppRoadDivider` e logotipo `ESTRADA+`) e `app/composables/useAuthSession.ts` compatível com SSR e CSR
- [x] 5.2 Criar `app/middleware/auth.global.ts` protegendo rotas operacionais, liberando `/login`, `/forgot-password` e `/reset-password`, e redirecionando sessão ativa em `/login` para `/`
- [x] 5.3 Implementar `app/pages/login.vue`, `app/pages/forgot-password.vue` e `app/pages/reset-password.vue` com `UForm`, estados de carregamento/erro/confirmação em `pt-BR`, acessibilidade e `<= 250` linhas por SFC
- [x] 5.4 Integrar `app/layouts/default.vue` e `app/components/layout/AppSidebar.vue` com `useAuthSession()` (`user.name`, `user.vehicleSummary`, `user.initials` e `logout()` + `navigateTo('/login')`)

## 6. Testes Automatizados e Quality Gate

- [ ] 6.1 Adicionar testes unitários em `test/unit/rate-limiter.spec.ts`, `test/unit/driver.repository.spec.ts`, `test/unit/password-reset.repository.spec.ts` e `test/unit/auth.service.spec.ts` (incluindo cobertura `>= 90%` em services, repositories e shared)
- [ ] 6.2 Adicionar `test/nuxt/auth-pages.spec.ts` e atualizar `test/nuxt/layout.spec.ts` e `test/nuxt/index.spec.ts` com contexto/mocks compatíveis com `auth.global.ts`
- [ ] 6.3 Configurar `playwright.config.ts` (`NUXT_APP_SECRET` e seed), criar `test/e2e/helpers/auth.ts` e `test/e2e/auth.spec.ts` (redirect, login, logout, rate limit isolado e reset isolado) e atualizar `test/e2e/home.spec.ts` e `test/e2e/navigation.spec.ts`
- [ ] 6.4 Executar `npm run format` e `npm run quality` comprovando exit code `0` em todos os gates G1–G13
