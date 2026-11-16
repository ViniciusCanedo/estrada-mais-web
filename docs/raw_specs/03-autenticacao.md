# 03 — Especificação Técnica: Autenticação e Recuperação de Senha (`autenticacao`)

## 1. Visão Geral

Este módulo especifica a autenticação completa do motorista autônomo no **Estrada+**, compreendendo login exclusivo com **usuário (e-mail) e senha**, gerenciamento de sessão selada via `useSession` (`nuxt/server`), proteção de rotas com middleware, **rate limiting** na rota de login para prevenção contra força bruta, fluxo de **recuperação de senha via e-mail com Magic Link** (token de redefinição de uso único) e encerramento de sessão (**botão `Desconectar`** no rodapé da Sidebar).

**Elementos do mockup ([estrada-desktop.html](file:///Users/vinicius.canedo/Documents/trae_projects/estrada_mais_web/estrada-desktop.html)) e requisitos alinhados cobertos:**

- **Rodapé da Sidebar (linhas 243–259):** Perfil do motorista autenticado (`Valdir Silveira`, `Scania R450 • 6x2`) e botão `Desconectar` (`logout`).
- **Seção "Segurança & Acesso" na tela de Configurações (linhas 1294–1317):** Credenciais (`E-mail de Acesso` e `Nova Senha`).
- **Telas Públicas de Autenticação (alinhadas no planejamento):**
  - `/login` — Autenticação com e-mail e senha no tema Night Highway.
  - `/forgot-password` — Solicitação de link de recuperação de senha por e-mail.
  - `/reset-password?token=...` — Redefinição de senha ao clicar no Magic Link recebido por e-mail.

---

## 2. Regras de Negócio e Critérios de Aceite

### 2.1 Regras de Negócio

1. **RN-AUTH-01 — Autenticação por E-mail e Senha:** O acesso a todas as telas operacionais (`/`, `/trips`, `/expenses`, `/settings`, `/reports/print`) e endpoints de dados exige uma sessão ativa válida associada a um registro na tabela `drivers`.
2. **RN-AUTH-02 — Hashing Seguro de Senha (`scrypt`):** Senhas nunca são armazenadas em texto puro. Utiliza-se `node:crypto.scrypt` com salt aleatório de 16 bytes e comparação em tempo constante (`timingSafeEqual`).
3. **RN-AUTH-03 — Mensagem Genérica em Falha de Login:** Se o e-mail não existir ou a senha estiver incorreta, a API retorna `401 Unauthorized` com a mesma mensagem (`"E-mail ou senha inválidos."`) e tempo de resposta equivalente para evitar enumeração de contas.
4. **RN-AUTH-04 — Rate Limiting Contra Força Bruta:**
   - A rota `POST /api/auth/login` aplica limite de **no máximo 5 tentativas malsucedidas a cada 15 minutos** por combinação de IP + e-mail (além do rate limiter global do `nuxt-security`). Ao exceder, retorna `429 Too Many Requests` informando o tempo restante de bloqueio.
   - A rota `POST /api/auth/forgot-password` aplica limite de **no máximo 3 solicitações a cada 15 minutos** por IP/e-mail.
5. **RN-AUTH-05 — Recuperação de Senha via E-mail com Magic Link:**
   - Ao solicitar recuperação em `POST /api/auth/forgot-password`, o sistema sempre responde `200 OK` com mensagem neutra (`"Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha em instantes."`).
   - Se o e-mail pertencer a um motorista ativo, invalida tokens anteriores pendentes desse motorista, gera um token criptográfico aleatório de 32 bytes (`64` caracteres hex), grava apenas seu **hash SHA-256** na tabela `password_reset_tokens` com validade de **30 minutos** (`expires_at`) e envia por e-mail (via `nodemailer`) o link `${NUXT_PUBLIC_APP_URL}/reset-password?token=${rawToken}`.
   - Ao submeter a nova senha em `POST /api/auth/reset-password`, o sistema valida que o hash SHA-256 do token existe, não foi utilizado (`used_at IS NULL`) e não expirou (`expires_at > now`), atualiza o `password_hash` do motorista, marca `used_at = now` e já inicia ou invalida sessões anteriores.
6. **RN-AUTH-06 — Sessão Selada (`useSession` do `nuxt/server`):** A sessão é armazenada em cookie `httpOnly: true`, `secure: process.env.NODE_ENV === 'production'`, `sameSite: 'lax'`, `maxAge: 60 * 60 * 24 * 7` (7 dias), selada com `NUXT_APP_SECRET`.

### 2.2 Critérios de Aceite (Checklist Verificável)

- [ ] Usuário não autenticado ao acessar `/`, `/trips`, `/expenses` ou `/settings` é redirecionado pelo middleware para `/login`.
- [ ] Login com credenciais válidas cria a sessão selada e redireciona para o Painel Principal (`/`).
- [ ] A 6ª tentativa consecutiva de login inválido dentro de 15 minutos retorna HTTP `429` com mensagem em `pt-BR`.
- [ ] Solicitar recuperação de senha gera registro em `password_reset_tokens` (apenas com `token_hash` SHA-256, nunca o token puro) e dispara o envio de e-mail com o Magic Link.
- [ ] Redefinir senha com token válido atualiza a senha, marca `used_at` e impede reutilização do mesmo link (segundo uso retorna `400 Bad Request`).
- [ ] Clicar no botão `Desconectar` na Sidebar chama `POST /api/auth/logout`, limpa o cookie de sessão e redireciona para `/login`.

---

## 3. Modelo de Dados (`server/database/schema.ts`)

### 3.1 Tabelas Drizzle (`drivers` e `password_reset_tokens`)

```ts
// Trecho ilustrativo de server/database/schema.ts
import { sqliteTable, integer, text, index, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const drivers = sqliteTable(
  'drivers',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    rntrc: text('rntrc').notNull(),
    vehicleModel: text('vehicle_model').notNull(),
    vehiclePlates: text('vehicle_plates').notNull(),
    targetConsumptionMilliKml: integer('target_consumption_milli_kml').notNull().default(2350),
    maxCostPerKmCents: integer('max_cost_per_km_cents').notNull().default(510),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [uniqueIndex('drivers_email_unique').on(table.email)],
)

export const passwordResetTokens = sqliteTable(
  'password_reset_tokens',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    driverId: integer('driver_id')
      .notNull()
      .references(() => drivers.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: text('expires_at').notNull(),
    usedAt: text('used_at'),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    uniqueIndex('password_reset_tokens_hash_unique').on(table.tokenHash),
    index('password_reset_tokens_driver_idx').on(table.driverId),
  ],
)
```

- **Estratégia de Migration:** Incluída na migration inicial `0000_initial_schema.sql` gerada via `npm run db:generate`.

---

## 4. Schemas Zod (`shared/schemas/auth.schema.ts`)

```ts
// shared/schemas/auth.schema.ts
import { z } from 'zod'

export const loginSchema = z.object({
  email: z.email('Informe um endereço de e-mail válido.').trim().toLowerCase(),
  password: z
    .string({ error: 'A senha é obrigatória.' })
    .min(8, 'A senha deve ter no mínimo 8 caracteres.')
    .max(128, 'A senha deve ter no máximo 128 caracteres.'),
})

export const forgotPasswordSchema = z.object({
  email: z.email('Informe um endereço de e-mail válido.').trim().toLowerCase(),
})

export const resetPasswordSchema = z
  .object({
    token: z
      .string({ error: 'O token de recuperação é obrigatório.' })
      .min(32, 'Token de recuperação inválido ou malformado.'),
    password: z
      .string({ error: 'A nova senha é obrigatória.' })
      .min(8, 'A nova senha deve ter no mínimo 8 caracteres.')
      .max(128, 'A nova senha deve ter no máximo 128 caracteres.'),
    confirmPassword: z.string({ error: 'A confirmação de senha é obrigatória.' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas informadas não coincidem.',
  })

export const sessionUserSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  email: z.email(),
  initials: z.string(),
  vehicleSummary: z.string(),
})

export type LoginInput = z.infer<typeof loginSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type SessionUser = z.infer<typeof sessionUserSchema>
```

- **Reuso:**
  - `loginSchema`: usado em `app/pages/login.vue` (`UForm`) e em `server/api/auth/login.post.ts` (`readValidatedBody`).
  - `forgotPasswordSchema`: usado em `app/pages/forgot-password.vue` (`UForm`) e em `server/api/auth/forgot-password.post.ts`.
  - `resetPasswordSchema`: usado em `app/pages/reset-password.vue` (`UForm`) e em `server/api/auth/reset-password.post.ts`.

---

## 5. Endpoints

| Método | Rota                        | Schema de Entrada             | Formato de Resposta                                                         | Códigos de Erro                                                                                |
| :----: | :-------------------------- | :---------------------------- | :-------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------- |
| `POST` | `/api/auth/login`           | `loginSchema` (body)          | `200 OK`: `{ data: SessionUser }` + Set-Cookie `nuxt-session`               | `400` (payload inválido), `401` (credenciais inválidas), `429` (limite de tentativas excedido) |
| `POST` | `/api/auth/logout`          | Nenhum                        | `200 OK`: `{ success: true }` (limpa cookie de sessão)                      | —                                                                                              |
| `GET`  | `/api/auth/me`              | Nenhum (lê cookie de sessão)  | `200 OK`: `{ data: SessionUser }`                                           | `401` (sessão inexistente ou expirada)                                                         |
| `POST` | `/api/auth/forgot-password` | `forgotPasswordSchema` (body) | `200 OK`: `{ success: true, message: 'Se o e-mail estiver cadastrado...' }` | `400` (e-mail malformado), `429` (rate limit excedido)                                         |
| `POST` | `/api/auth/reset-password`  | `resetPasswordSchema` (body)  | `200 OK`: `{ success: true, message: 'Senha redefinida com sucesso.' }`     | `400` (token inválido, expirado ou já utilizado)                                               |

---

## 6. Services e Repositories

### 6.1 Repositories

- **`server/repositories/driver.repository.ts`:**
  - `findByEmail(email: string): DriverRow | undefined`
  - `findById(id: number): DriverRow | undefined`
  - `updatePasswordHash(driverId: number, passwordHash: string, updatedAt: string): void`
- **`server/repositories/password-reset.repository.ts`:**
  - `invalidatePendingByDriver(driverId: number, usedAt: string): void`
  - `createToken(input: { driverId: number; tokenHash: string; expiresAt: string; createdAt: string }): void`
  - `findValidByHash(tokenHash: string, nowIso: string): PasswordResetTokenRow | undefined`
  - `markAsUsed(id: number, usedAt: string): void`

### 6.2 Services e Utilitários de Servidor

- **`server/services/auth.service.ts`:**
  - `authenticate(input: LoginInput, clientKey: string): Promise<SessionUser>`
  - `getSessionProfile(driverId: number): SessionUser`
  - `requestPasswordReset(input: ForgotPasswordInput, appBaseUrl: string): Promise<void>`
  - `resetPassword(input: ResetPasswordInput): Promise<void>`
- **`server/utils/password.ts`:**
  - `hashPassword(plain: string): Promise<string>` (`scrypt` com salt de 16 bytes formato `scrypt$saltHex$derivedKeyHex`)
  - `verifyPassword(plain: string, storedHash: string): Promise<boolean>` (`timingSafeEqual`)
  - `hashTokenSha256(rawToken: string): string`
- **`server/utils/rate-limiter.ts`:**
  - Controle de janela deslizante por chave (`login:${ip}:${email}` e `forgot:${ip}`) com bloqueio determinístico após o limite configurado e função `resetRateLimitForTests()`.
- **`server/utils/mailer.ts`:**
  - `sendPasswordResetEmail(to: string, driverName: string, resetUrl: string): Promise<void>` via `nodemailer` usando `runtimeConfig.smtp`.

---

## 7. Front-end

### 7.1 Layouts, Páginas, Middleware e Composables

| Tipo           | Caminho                             | Responsabilidade                                                                                                                                                                        |
| :------------- | :---------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Layout**     | `app/layouts/auth.vue`              | Layout centralizado com estética Night Highway (fundo `#141416`, card `#1d1d20` com borda âmbar e `.road-divider`, logotipo `ESTRADA+`).                                                |
| **Página**     | `app/pages/login.vue`               | Formulário `UForm` com `:schema="loginSchema"`, campos E-mail e Senha, alerta de erro/rate-limit, botão `Entrar no Painel` e link `Esqueceu sua senha?`.                                |
| **Página**     | `app/pages/forgot-password.vue`     | Formulário `UForm` com `:schema="forgotPasswordSchema"`, envio do Magic Link e estado de confirmação visual.                                                                            |
| **Página**     | `app/pages/reset-password.vue`      | Lê `?token=` da query string, renderiza `UForm` com `:schema="resetPasswordSchema"` (`password` e `confirmPassword`) e redireciona para `/login` após sucesso.                          |
| **Middleware** | `app/middleware/auth.global.ts`     | Verifica estado do `useAuthSession()`; permite rotas públicas (`/login`, `/forgot-password`, `/reset-password`) e redireciona usuários não autenticados nas demais rotas para `/login`. |
| **Composable** | `app/composables/useAuthSession.ts` | Expõe `user: Ref<SessionUser                                                                                                                                                            | null>`, `isAuthenticated: ComputedRef<boolean>`, `login(payload)`, `logout()`, `requestPasswordReset(payload)`, `confirmPasswordReset(payload)`e`fetchSession()`. |

---

## 8. Seeds e Factories (`server/database/seed.ts`)

- **Motorista Padrão de Desenvolvimento:**
  - `name`: `'Valdir Silveira'`
  - `email`: `'valdir.silveira.truck@estrada.com.br'`
  - `password`: `'Estrada@2026'` (persistida via `hashPassword('Estrada@2026')`)
  - `rntrc`: `'58.912.440-TAC'`
  - `vehicleModel`: `'Scania R450 Highline 6x2 (2021)'`
  - `vehiclePlates`: `'BRA-2E19 / CUR-4901'`
  - `targetConsumptionMilliKml`: `2350` (`2,35 km/L`)
  - `maxCostPerKmCents`: `510` (`R$ 5,10 / km`)
- **Factories para Testes:**
  - `createTestDriver(db, overrides?)` e `createTestResetToken(db, driverId, overrides?)` usando `drizzle-seed` / builders determinísticos.

---

## 9. Estratégia de Testes

1. **Unitários (`test/unit/auth.service.spec.ts`, `test/unit/password.spec.ts`, `test/unit/rate-limiter.spec.ts`):**
   - Hash e verificação de senha com `scrypt` (sucesso, senha errada, hash malformado).
   - Login bem-sucedido retornando `SessionUser` com iniciais `VS` e resumo `Scania R450 • 6x2`.
   - Bloqueio de rate limit na 6ª tentativa de login falha consecutiva (`429 Too Many Requests`) e liberação após expiração da janela (`vi.useFakeTimers()`).
   - Geração de Magic Link: verifica que o token salvo no banco é o hash SHA-256 (diferente do token enviado no link de e-mail) e que tokens anteriores do motorista são invalidados.
   - Casos de borda do `resetPassword`: token inexistente, token expirado (`expires_at` no passado) e token já utilizado (`used_at` preenchido).
2. **Integração (`test/nuxt/auth-pages.spec.ts`):**
   - Validação de formulário com `loginSchema` e `resetPasswordSchema` (senhas divergentes exibem `"As senhas informadas não coincidem."`).
   - Redirecionamento do middleware `auth.global.ts`.
3. **E2E (`test/e2e/auth.spec.ts`):**
   - Fluxo completo: tentativa de acesso a `/` redireciona para `/login` → login com `valdir.silveira.truck@estrada.com.br` → visualização do painel → clique em `Desconectar` na Sidebar → retorno a `/login`.

---

## 10. Gates Aplicáveis

- **G1–G4:** Formatação, lint, tipagem estrita e complexidade ciclomática `<= 10`.
- **G7 & G8 (`deps:check` & `test:arch`):** `server/api/auth/*.ts` apenas valida com schemas de `#shared/schemas/auth.schema`, gerencia o cookie via `useSession` e delega toda a regra ao `AuthService`.
- **G9 (`test:coverage`):** Cobertura `>= 90%` em `server/services/auth.service.ts`, `server/repositories/password-reset.repository.ts` e `shared/schemas/auth.schema.ts`.
- **G12 (`secrets:check`):** Nenhum segredo real hardcoded nos testes ou seeds.
- **G13 (`test:e2e`):** Fluxo de login, proteção de rota e logout validado no Playwright.

---

## 11. Dependências e Pontos em Aberto

- **Dependências:** Depende de `01-configuracao-projeto` e `02-design-system-e-layout`.
- **Pontos em Aberto:** Nenhum (provedor SMTP de produção será configurado via variáveis `NUXT_SMTP_*` no deploy).
