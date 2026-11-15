# Diretório `server/utils/`

O diretório `server/utils/` armazena funções utilitárias, serviços de domínio, clientes de banco de dados/APIs externas e wrappers de handlers que são **auto-importados exclusivamente dentro do diretório `server/`**.

> Documentação oficial: [Nuxt 4 — Server Utilities](https://nuxt.com/docs/4.x/directory-structure/server#server-utilities)

## Como Funciona

Além dos helpers nativos do **h3** (como `readBody`, `getQuery`, `getRouterParam`, `setCookie`, `createError`), qualquer função ou constante exportada nos arquivos de `server/utils/` fica automaticamente disponível em `server/api/`, `server/routes/`, `server/middleware/` e `server/plugins/` sem necessidade de `import` explícito (ou pode ser importada explicitamente via `#server/utils/...`).

## Regras de Criação de Arquivos

1. **Nomenclatura**:
   - Nomeie os arquivos em **kebab-case** (ex.: `auth.ts`, `database.ts`, `rate-limit.ts`, `response-handler.ts`).
   - Nomeie as funções exportadas em **camelCase** com nomes claros e descritivos (ex.: `verifySessionToken`, `defineAuthenticatedEventHandler`).
2. **Escaneamento e Exportação**:
   - Prefira colocar os arquivos diretamente na raiz de `server/utils/` ou re-exportar subdiretórios através de `server/utils/index.ts`.
   - Caso prefira importação explícita em subpastas profundas, utilize o alias `#server/utils/<caminho>`.
3. **Isolamento de Ambiente**:
   - Funções em `server/utils/` **não** podem ser importadas em `app/`. Se uma função pura precisar ser usada tanto no servidor quanto no cliente, mova-a para `shared/utils/`.

## Exemplo de Uso: Wrapper de Handler Customizado

```ts
// server/utils/authenticated-handler.ts
import type { EventHandler, EventHandlerRequest } from 'h3'

export function defineAuthenticatedHandler<T extends EventHandlerRequest, D>(
  handler: EventHandler<T, D>,
): EventHandler<T, D> {
  return defineEventHandler<T>(async (event) => {
    const authHeader = getRequestHeader(event, 'authorization')

    if (!authHeader?.startsWith('Bearer ')) {
      throw createError({
        status: 401,
        statusText: 'Não autenticado.',
      })
    }

    return await handler(event)
  })
}
```

Uso direto em qualquer rota de `server/api/`:

```ts
// server/api/profile.get.ts
export default defineAuthenticatedHandler((event) => {
  return {
    userId: event.context.auth?.userId,
  }
})
```

## Boas Práticas

- **Centralize a Lógica de Negócio Aqui**: Mantenha os arquivos em `server/api/` focados apenas na camada HTTP e extraia regras de negócio, chamadas a APIs externas com `$fetch` e consultas a banco de dados para `server/utils/`.
- **Receba `H3Event` quando precisar de `useRuntimeConfig`**: Sempre que um utilitário do servidor precisar ler variáveis de ambiente via `useRuntimeConfig(event)`, receba `event: H3Event` como parâmetro para garantir compatibilidade com ambientes serverless/edge.
