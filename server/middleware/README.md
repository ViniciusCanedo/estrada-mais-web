# Diretório `server/middleware/`

O diretório `server/middleware/` armazena os **middlewares de servidor do Nitro**. Todo arquivo criado aqui é executado automaticamente em **todas as requisições recebidas pelo servidor** (rotas de páginas SSR, `/api/*` e `/routes/*`) antes de qualquer handler de rota ser processado.

> Documentação oficial: [Nuxt 4 — Server Middleware](https://nuxt.com/docs/4.x/directory-structure/server#server-middleware)

> **Importante**: Não confunda `server/middleware/` (executado no servidor Nitro a cada requisição HTTP) com `app/middleware/` (guardas de navegação do Vue Router executados na troca de páginas).

## Casos de Uso Ideais

- Ler/validar tokens ou cookies de autenticação e popular `event.context.auth` (ou `event.context.user`).
- Injetar cabeçalhos HTTP de segurança ou correlação (`X-Request-Id`).
- Registrar métricas ou auditoria de requisições no servidor.
- Bloquear requisições não autorizadas para determinados prefixos de URL (ex.: `/api/admin/*`) lançando `createError`.

## Regras de Criação de Arquivos

1. **Nunca Retorne Valores em um Server Middleware**:
   - **Regra Crítica do Nitro**: Um middleware de servidor **não deve retornar nada** (`return` vazio) nem encerrar a requisição, a menos que queira interromper o fluxo lançando um erro com `throw createError(...)` ou realizando um redirecionamento explícito (`await sendRedirect(event, ...)`).
   - Se um middleware retornar um objeto ou string, o Nitro encerrará a requisição imediatamente com aquele valor e **nenhuma rota ou página será renderizada**.
2. **Nomenclatura e Ordem de Execução**:
   - Os arquivos são executados em ordem alfabética. Utilize prefixos numéricos com zero à esquerda (`01.cors.ts`, `02.auth.ts`) para controlar a ordem de execução.
   - Utilize sempre `export default defineEventHandler((event) => { ... })`.
3. **Tipagem do `event.context`**:
   - Ao anexar propriedades customizadas a `event.context`, estenda a interface `H3EventContext` em `server/types/` para garantir autocompletar e segurança de tipos em todas as rotas.

## Exemplo de Uso

### 1. Tipando o Contexto em `server/types/h3.d.ts`

```ts
// server/types/h3.d.ts
declare module 'h3' {
  interface H3EventContext {
    requestId?: string
  }
}

export {}
```

### 2. Criando o Middleware em `server/middleware/01.request-id.ts`

```ts
// server/middleware/01.request-id.ts
export default defineEventHandler((event) => {
  const requestId = getRequestHeader(event, 'x-request-id') ?? crypto.randomUUID()
  event.context.requestId = requestId
  setResponseHeader(event, 'x-request-id', requestId)
})
```

## Boas Práticas

- **Filtre por caminho quando necessário**: Como middlewares de servidor rodam em **toda** requisição (inclusive páginas SSR), verifique `getRequestURL(event).pathname.startsWith('/api/...')` se a lógica (como validação de token de API) só precisar ser aplicada a rotas específicas.
- **Mantenha a execução rápida**: Operações lentas em `server/middleware/` adicionam latência a todas as requisições da aplicação.
