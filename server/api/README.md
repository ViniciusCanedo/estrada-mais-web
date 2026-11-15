# Diretório `server/api/`

O diretório `server/api/` armazena os **endpoints de API** da aplicação. Todos os arquivos criados aqui são escaneados automaticamente pelo Nitro e registrados com o prefixo **`/api`** na URL.

> Documentação oficial: [Nuxt 4 — Server Routes (`server/api`)](https://nuxt.com/docs/4.x/directory-structure/server#server-routes)

## Mapeamento de Arquivos para Endpoints

| Arquivo em `server/api/` | Método HTTP | Endpoint Gerado            |
| :----------------------- | :---------- | :------------------------- |
| `health.get.ts`          | `GET`       | `/api/health`              |
| `users/index.get.ts`     | `GET`       | `/api/users`               |
| `users/index.post.ts`    | `POST`      | `/api/users`               |
| `users/[id].get.ts`      | `GET`       | `/api/users/:id`           |
| `users/[id].patch.ts`    | `PATCH`     | `/api/users/:id`           |
| `users/[id].delete.ts`   | `DELETE`    | `/api/users/:id`           |
| `proxy/[...slug].ts`     | Qualquer    | `/api/proxy/*` (Catch-all) |

## Regras de Criação de Arquivos

1. **Sufixo de Método HTTP Obrigatório**:
   - Sempre especifique o método HTTP no nome do arquivo: `<recurso>.<metodo>.ts` (ex.: `login.post.ts`, `profile.get.ts`) ou `index.<metodo>.ts` dentro de subpastas de recursos.
   - Evite criar arquivos sem sufixo de método (ex.: `users.ts`), exceto em rotas catch-all de proxy.
2. **Nomenclatura**:
   - Utilize **kebab-case** para nomes de arquivos e pastas de recursos (ex.: `server/api/user-settings/index.get.ts` → `/api/user-settings`).
   - Parâmetros dinâmicos devem usar colchetes `[id].get.ts` e rotas catch-all `[...slug].ts`.
3. **Exportação com `defineEventHandler`**:
   - Todo arquivo deve exportar por padrão `defineEventHandler(async (event) => { ... })`.
4. **Leitura Segura de Dados (h3 Helpers)**:
   - **Parâmetros de rota**: `getRouterParam(event, 'id')` ou `await getValidatedRouterParams(event, schema)`.
   - **Query params**: `getQuery(event)` ou `await getValidatedQuery(event, schema)`.
   - **Corpo da requisição**: `await readBody(event)` ou `await readValidatedBody(event, schema)` (apenas em métodos `POST`, `PUT`, `PATCH`).

## Exemplo de Endpoint Tipado

```ts
// server/api/users/[id].get.ts
export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      status: 400,
      statusText: 'O parâmetro ID é obrigatório.',
    })
  }

  return {
    id,
    name: 'Usuário Exemplo',
  }
})
```

Consumo automático com inferência de tipos em `app/`:

```vue
<script setup lang="ts">
const { data: user } = await useFetch('/api/users/123')
</script>
```

## Boas Práticas

- **Mantenha os Route Handlers enxutos**: O arquivo em `server/api/` deve cuidar apenas de ler/validar a requisição HTTP, invocar a regra de negócio/serviço (em `server/utils/`) e devolver a resposta ou erro HTTP.
- **Tipagem de Resposta Compartilhada**: Sempre que o tipo de retorno ou payload também for usado em componentes ou composables no `app/`, defina a interface em `shared/types/`.
- **Códigos de Status HTTP**: Use `setResponseStatus(event, 201)` para criações bem-sucedidas ou `throw createError({ status: 404, statusText: 'Recurso não encontrado' })` para falhas.
