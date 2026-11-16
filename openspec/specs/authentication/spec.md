# authentication Specification

## Purpose

Definir os requisitos normativos de autenticação do motorista autônomo (TAC) no Estrada+, compreendendo login por e-mail e senha com hash `scrypt`, sessão selada via `useSession` em cookie `httpOnly` (`nuxt-session`), proteção contra força bruta via rate limiting em janela deslizante, mitigação de enumeração de contas, recuperação de senha com Magic Link de uso único (token SHA-256) e proteção global de rotas no cliente e SSR.

## Requirements

### Requirement: Autenticação por e-mail e senha e proteção global de rotas (RN-AUTH-01)

O sistema SHALL exigir sessão ativa autenticada associada a um registro válido na tabela `drivers` para o acesso às rotas operacionais (`/`, `/trips`, `/expenses`, `/settings` e demais rotas protegidas) e ao perfil via `GET /api/auth/me`, redirecionando usuários não autenticados para `/login` por meio de `app/middleware/auth.global.ts`; as rotas públicas `/login`, `/forgot-password` e `/reset-password` MUST permanecer acessíveis sem sessão, e usuários já autenticados ao acessarem `/login` MUST ser redirecionados para `/`. Além disso, `GET /api/health` SHALL continuar respondendo `200 OK` quando deslogado (sem `navigationCounts`) e popular `navigationCounts` reais do motorista quando existir sessão válida.

#### Scenario: Redirecionamento de usuário não autenticado para `/login` e proteção de `/api/auth/me`

- **WHEN** um usuário sem sessão válida acessa `/`, `/trips`, `/expenses` ou `/settings`, ou requisita `GET /api/auth/me`
- **THEN** o middleware redireciona a navegação para `/login` e `GET /api/auth/me` retorna HTTP `401` (`DomainError('UNAUTHORIZED', ...)`)

#### Scenario: Login válido redireciona para o Painel Principal e popula perfil na Sidebar e `/api/health`

- **WHEN** o motorista submete credenciais válidas (`valdir.silveira.truck@estrada.com.br`) em `/login` (`POST /api/auth/login`) e acessa `/`
- **THEN** recebe `200 OK` com `{ data: SessionUser }` (`initials: 'VS'`, `vehicleSummary: 'Scania R450 • 6x2'`), navega para `/`, visualiza nome, iniciais e veículo reais na `AppSidebar`, e `GET /api/health` passa a retornar `navigationCounts` do motorista autenticado

#### Scenario: Encerramento de sessão via botão Desconectar na Sidebar

- **WHEN** o motorista autenticado clica no botão `Desconectar` (`logout-btn`) na `AppSidebar`
- **THEN** o sistema invoca `POST /api/auth/logout`, limpa o cookie `nuxt-session` (`Max-Age=0`), limpa o estado de sessão no cliente e redireciona para `/login`

### Requirement: Hashing seguro de senha e armazenamento protegido de tokens (RN-AUTH-02)

Senhas nunca SHALL ser persistidas em texto puro; o sistema MUST utilizar `hashPassword` e `verifyPassword` (`node:crypto.scrypt` com salt aleatório de 16 bytes e comparação em tempo constante via `timingSafeEqual`), enquanto tokens de redefinição de senha MUST ser armazenados exclusivamente como digest hexadecimal SHA-256 (`hashTokenSha256`) na tabela `password_reset_tokens`.

#### Scenario: Armazenamento e validação segura de credenciais e hashes

- **WHEN** um motorista é semeado ou redefine a senha via `AuthService.resetPassword` e realiza login via `AuthService.authenticate`
- **THEN** `drivers.password_hash` armazena apenas o formato `scrypt$<saltHex>$<derivedKeyHex>` e `password_reset_tokens.token_hash` armazena apenas o digest SHA-256 distinto do token bruto enviado no link

### Requirement: Resposta genérica e mitigação de enumeração de contas no login (RN-AUTH-03)

Quando o e-mail não estiver cadastrado ou a senha estiver incorreta em `POST /api/auth/login`, a API SHALL retornar HTTP `401 Unauthorized` (`DomainError('UNAUTHORIZED', 'E-mail ou senha inválidos.')`) com mensagem idêntica e executando verificação `scrypt` dummy em tempo equivalente mesmo quando o motorista não existir, impedindo enumeração de contas por mensagem ou tempo de resposta.

#### Scenario: Credenciais inválidas por e-mail inexistente ou senha incorreta retornam erro idêntico

- **WHEN** `POST /api/auth/login` recebe um e-mail não cadastrado ou um e-mail válido com senha errada
- **THEN** ambas as requisições executam derivação `scrypt` e retornam HTTP `401` com a mensagem genérica `'E-mail ou senha inválidos.'`

### Requirement: Rate limiting contra força bruta em login e recuperação de senha (RN-AUTH-04)

O utilitário `server/utils/rate-limiter.ts` SHALL controlar tentativas em janela deslizante de 15 minutos em memória: `POST /api/auth/login` MUST bloquear após **5** falhas consecutivas por combinação `ip + email` retornando HTTP `429 Too Many Requests` (`DomainError('RATE_LIMITED', ...)`) com o tempo restante em `pt-BR` a partir da **6ª** tentativa (zerando o contador em caso de login bem-sucedido); `POST /api/auth/forgot-password` MUST permitir no máximo **3** solicitações a cada 15 minutos por `ip`, retornando HTTP `429` na **4ª** tentativa.

#### Scenario: Bloqueio na 6ª tentativa de login falha e liberação após expiração da janela

- **WHEN** ocorrem 5 tentativas de login malsucedidas consecutivas para o mesmo `ip + email` dentro de 15 minutos e uma 6ª tentativa é enviada
- **THEN** as 5 primeiras falham com HTTP `401`, a 6ª retorna HTTP `429` informando o tempo restante em `pt-BR`, e após avançar 15 minutos da janela deslizante o acesso volta a ser permitido

#### Scenario: Limite de 3 solicitações em 15 minutos para recuperação de senha por IP

- **WHEN** um mesmo IP envia 4 solicitações para `POST /api/auth/forgot-password` dentro de 15 minutos
- **THEN** as 3 primeiras respondem `200 OK` e a 4ª retorna HTTP `429` informando o tempo restante em `pt-BR`

### Requirement: Fluxo de recuperação de senha com Magic Link de uso único (RN-AUTH-05)

Ao receber `POST /api/auth/forgot-password` validado por `forgotPasswordSchema`, o sistema SHALL responder sempre `200 OK` com mensagem neutra (`'Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha em instantes.'`); se o motorista existir, MUST invalidar tokens pendentes anteriores do motorista (`used_at = now`), gerar token criptográfico aleatório de 32 bytes (`64` caracteres hex), persistir seu hash SHA-256 com validade de **30 minutos** e enviar `${appUrl}/reset-password?token=${rawToken}` via `sendPasswordResetEmail`. Ao submeter `POST /api/auth/reset-password` validado por `resetPasswordSchema`, o sistema MUST verificar que o hash existe, `used_at IS NULL` e `expires_at > now`, atualizar `password_hash` do motorista, marcar `used_at = now` e rejeitar qualquer reutilização, expiração ou token inexistente com HTTP `400` (`DomainError('VALIDATION_ERROR', ...)`).

#### Scenario: Solicitação de Magic Link invalida tokens pendentes anteriores e persiste apenas SHA-256

- **WHEN** um motorista cadastrado solicita recuperação de senha duas vezes consecutivas via `POST /api/auth/forgot-password`
- **THEN** a resposta é `200 OK` com mensagem neutra em ambos os casos, o primeiro token pendente é marcado como utilizado (`used_at` preenchido), e apenas o hash SHA-256 do novo token com expiração de 30 minutos permanece ativo para envio via `sendPasswordResetEmail`

#### Scenario: Redefinição bem-sucedida e bloqueio de reuso ou token expirado/inexistente

- **WHEN** o usuário redefine a senha em `/reset-password?token=<rawToken>` com token válido e posteriormente tenta reutilizar o mesmo token, um token expirado ou um token inexistente
- **THEN** a primeira submissão retorna `200 OK` (`'Senha redefinida com sucesso.'`), atualiza a senha no banco e redireciona para `/login`; qualquer tentativa subsequente com o mesmo token, token expirado ou inexistente retorna HTTP `400`

### Requirement: Sessão selada via `useSession` e contratos Zod compartilhados em `pt-BR` (RN-AUTH-06)

A sessão SHALL ser gerenciada em `server/utils/session.ts` utilizando `useSession` / `clearSession` (`h3`) com o cookie `nuxt-session` configurado com `httpOnly: true`, `sameSite: 'lax'`, `maxAge: 604800` (7 dias), `secure` habilitado quando a requisição for HTTPS (`x-forwarded-proto === 'https'` ou `appUrl.startsWith('https://')`) e selado com `useRuntimeConfig().appSecret` (com fallback >= 32 caracteres exclusivamente em dev/test sem expor segredos literais no repositório). Os schemas `loginSchema`, `forgotPasswordSchema`, `resetPasswordSchema`, `sessionUserSchema` e `logoutQuerySchema` em `shared/schemas/auth.schema.ts` MUST ser compartilhados entre `UForm` no front-end e handlers em `server/api/auth/*` com mensagens de erro em `pt-BR`.

#### Scenario: Validação isomórfica em `pt-BR` e configuração segura do cookie de sessão

- **WHEN** o usuário envia formulário inválido (e-mail inválido, senha < 8 caracteres ou confirmação divergente) ou realiza login válido via HTTP local vs. HTTPS
- **THEN** `UForm` e os endpoints retornam as mensagens em `pt-BR` definidas em `shared/schemas/auth.schema.ts` (ex.: `'As senhas informadas não coincidem.'`), e `Set-Cookie` inclui `nuxt-session`, `HttpOnly`, `SameSite=Lax`, `Max-Age=604800` e `Secure` condicionado a HTTPS
