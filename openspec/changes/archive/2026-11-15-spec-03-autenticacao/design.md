## Context

As specs `01-configuracao-projeto` e `02-design-system-e-layout` estabeleceram a fundação Nuxt 4 + Drizzle ORM (`better-sqlite3`), o schema SQLite com as tabelas `drivers` e `password_reset_tokens`, os utilitários `server/utils/password.ts` e `server/utils/mailer.ts`, e o shell visual Night Highway (`app/layouts/default.vue`, `AppSidebar.vue`, `AppTopBar.vue`). Entretanto, todas as páginas operacionais e `/api/health` operam sem sessão autenticada, `AppSidebar` exibe um motorista estático por padrão e não há proteção de rotas nem fluxo de login ou recuperação de senha.

Restrições normativas e de arquitetura aplicáveis:

- `.dependency-cruiser.cjs` e `test/arch/layers.spec.ts` impõem a separação `server/api/**` → `server/services/**` → `server/repositories/**` → `server/database/**`, além de exigir importação de `#shared/schemas/` + `readValidatedBody`/`getValidatedQuery`/`getValidatedRouterParams` em todos os handlers `POST`/`PUT`/`PATCH`.
- `eslint.config.mjs` proíbe `process.env` fora da lista de configuração (`nuxt.config.ts`, `playwright.config.ts`, `migrate.ts`, `seed.ts`), impõe `max-lines: 250` em `.vue`, `max-lines-per-function: 50`, complexidade ciclomática `<= 10`, acessibilidade (`vuejs-accessibility`) e validação Tailwind v4.
- `secretlint` (`npm run secrets:check`) bloqueia qualquer literal que pareça chave/segredo no código ou testes.
- Cobertura mínima de `90%` em `server/services/**`, `server/repositories/**` e `shared/**`, além de `>= 80%` global.

## Goals / Non-Goals

**Goals:**

- Implementar schemas Zod isomórficos (`shared/schemas/auth.schema.ts`) compartilhados entre `UForm` e Nitro.
- Encapsular sessão selada (`h3` `useSession`/`clearSession`) em `server/utils/session.ts` compatível tanto com HTTPS em produção quanto com `http://127.0.0.1` no Playwright E2E.
- Implementar rate limiter em janela deslizante em memória (`server/utils/rate-limiter.ts`), repositórios (`driver.repository.ts`, `password-reset.repository.ts`), `AuthService` (com mitigação de timing attack via verificação `scrypt` dummy) e endpoints `server/api/auth/*.ts` + integração com `server/api/health.get.ts`.
- Criar o layout `app/layouts/auth.vue`, composable `app/composables/useAuthSession.ts`, middleware global `app/middleware/auth.global.ts`, páginas `/login`, `/forgot-password`, `/reset-password` e conectar `app/layouts/default.vue` e `AppSidebar.vue` à sessão real.
- Garantir execução paralela determinística no Playwright E2E com seed idempotente e sem colisão de rate limit ou mutação da senha do motorista padrão `Valdir Silveira`.

**Non-Goals:**

- Edição de perfil/credenciais em `/settings` (spec `04`).
- Rate limiting distribuído via Redis ou armazenamento persistente de sessões em banco (usa cookie selado stateless `h3` e janela deslizante em memória).

## Decisions

### 1. Leitura sem emissão de cookie vazio em `getSessionDriverId` e flag `secure` adaptativa

- **Decisão:** Em `server/utils/session.ts`, `getSessionDriverId(event)` verifica primeiro a existência do cookie `nuxt-session` via `getCookie(event, 'nuxt-session')` antes de chamar `useSession(event, ...)`. Além disso, `secure` é calculado a partir de `x-forwarded-proto === 'https'`, `socket.encrypted === true` ou `runtimeConfig.public.appUrl.startsWith('https://')` (quando não for `localhost`/`127.0.0.1`).
- **Motivação:** No `h3`, chamar `useSession(event, config)` quando não há cookie inicializa uma nova sessão vazia e emite `Set-Cookie` + exige `password >= 32` chars mesmo em chamadas anônimas como `GET /api/health` (quebrando healthchecks/Docker/smoke tests). Adicionalmente, usar `NODE_ENV === 'production'` puro para `cookie.secure` impediria a entrega de cookies no servidor de produção local do Playwright (`http://127.0.0.1:<porta>`).
- **Alternativas consideradas:** Usar `useSession` incondicionalmente em `/api/health` (descartado por emitir cookies desnecessários e acoplar `/api/health` ao segredo de sessão) e fixar `secure: false` sempre (descartado por degradar segurança em produção HTTPS).

### 2. Fallback seguro de segredo de sessão restrito a dev/test + configuração no `playwright.config.ts`

- **Decisão:** `resolveSessionSecret()` usa `useRuntimeConfig(event).appSecret` quando possui `>= 32` caracteres; exclusivamente em desenvolvimento (`import.meta.dev`) ou execução sob Vitest (`'__vitest_worker__' in globalThis`) usa um fallback determinístico composto sem alta entropia para não acionar `secretlint` e sem `process.env`; em produção real sem `appSecret`, lança `DomainError('SERVICE_UNAVAILABLE', ...)`. Em `playwright.config.ts` (isento de `no-process-env` no ESLint), garante-se `NUXT_APP_SECRET` válido (`>= 32` chars) quando ausente no ambiente.
- **Motivação:** Evita falha silenciosa com segredo fraco em produção real, respeita `no-process-env` e `secretlint`, e mantém testes unitários/Nuxt/E2E totalmente operacionais.
- **Alternativas consideradas:** Gerar chave efêmera aleatória em produção quando ausente (descartado porque invalidaria sessões entre reinicializações/workers e mascararia erro de deploy).

### 3. Padronização de normalização de e-mail em Zod 4 com `.pipe(z.email(...))`

- **Decisão:** Definir `normalizedEmailSchema = z.string({ error: ... }).trim().toLowerCase().pipe(z.email(...))` em `shared/schemas/auth.schema.ts`.
- **Motivação:** Em Zod 4, `z.email(...).trim()` executa a validação de formato antes do `.trim()`, rejeitando e-mails válidos digitados com espaços acidentais nas extremidades. O encadeamento com `.pipe(z.email(...))` normaliza espaços e caixa antes de validar o formato, mantendo inferência estrita de tipo `string`.
- **Alternativas consideradas:** Usar `z.email(...).trim().toLowerCase()` direto (rejeitado após verificação prática em Node com Zod `4.6.7`).

### 4. Validação de entrada em `POST /api/auth/logout` via `logoutQuerySchema`

- **Decisão:** `server/api/auth/logout.post.ts` importa `logoutQuerySchema` (`z.object({})`) de `#shared/schemas/auth.schema` e valida a query via `getValidatedQuery(event, logoutQuerySchema.parse)` antes de chamar `clearDriverSession(event)`.
- **Motivação:** A regra arquitetural em `test/arch/layers.spec.ts` exige que todo handler `POST`/`PUT`/`PATCH` em `server/api/**` importe um schema de `#shared/schemas/` e utilize `readValidatedBody`/`getValidatedQuery`/`getValidatedRouterParams`. O uso de `getValidatedQuery` permite que `$fetch('/api/auth/logout', { method: 'POST' })` funcione sem corpo HTTP enquanto atende integralmente ao gate de arquitetura sem enfraquecê-lo.
- **Alternativas consideradas:** Alterar `test/arch/layers.spec.ts` para abrir exceção para `logout.post.ts` (proibido pela §9 da Constituição).

### 5. Mitigação de timing attack com hash `scrypt` dummy gerado em memória e controle de concorrência E2E

- **Decisão:** Em `AuthService.authenticate`, quando o e-mail não é encontrado, executa-se `verifyPassword(input.password, await getDummyPasswordHash())`, onde `getDummyPasswordHash()` gera e memoriza um hash `scrypt` na primeira chamada em vez de armazenar um literal hexadecimal de 128 chars no código-fonte. Na camada de apresentação, `AppSidebar.vue` recebe `driver?: SidebarDriverProfile` agrupando `{ name, vehicleSummary, initials }` para manter o total de props `<= 8` (§4.1) e reutilizar `user` de `useAuthSession()` sem recalcular iniciais na UI. Para E2E paralelo no Playwright, `playwright.config.ts` executa `globalSetup` (ou `helpers/auth.ts` garante migração/seed idempotentes antes dos workers) e testes de rate limit e reset de senha usam e-mails/usuários isolados para não afetar `Valdir Silveira`.
- **Motivação:** Evita falsos positivos de `secretlint`, protege contra enumeração por tempo, respeita limite de props por componente e garante estabilidade determinística em workers paralelos do Playwright.
- **Alternativas consideradas:** Hardcode de hash dummy no serviço e reutilização do usuário Valdir nos testes destrutivos de E2E (rejeitado por risco de `secretlint` e flakiness em paralelo).

## Risks / Trade-offs

- **Risco:** `auth.global.ts` redirecionar testes Nuxt existentes (`test/nuxt/index.spec.ts`, `test/nuxt/layout.spec.ts`) ou consumir `/api/auth/me` em cada navegação. → **Mitigação:** Manter `hasLoadedSession` em `useState('auth:loaded', () => false)` dentro de `useAuthSession()` para evitar chamadas redundantes após a carga inicial e registrar endpoint mock `/api/auth/me` nos testes Nuxt de layout/página inicial.
- **Risco:** Condição de corrida no seed inicial quando múltiplos workers do Playwright iniciam simultaneamente contra o mesmo arquivo SQLite. → **Mitigação:** Executar `globalSetup` antes da criação dos workers no `playwright.config.ts` e tornar `ensureE2eDatabaseReady()` em `test/e2e/helpers/auth.ts` resiliente e idempotente.
- **Risco:** Rate limiter global padrão do `nuxt-security` (`150` req / `5 min`) ou CSP interferir no fluxo de login em E2E. → **Mitigação:** Manter volume de requisições E2E abaixo do limite global e validar os fluxos reais completos em `npm run test:e2e`.
