# Diretório `app/middleware/`

O diretório `app/middleware/` armazena os **middlewares de rota** (guardas de navegação) da aplicação Vue. Eles executam código **antes** de concluir a navegação para uma rota específica (ex.: verificação de autenticação, permissões ou redirecionamentos).

> Documentação oficial: [Nuxt 4 — `middleware`](https://nuxt.com/docs/4.x/directory-structure/app/middleware)

> **Importante**: Os middlewares de `app/middleware/` executam na camada Vue durante transições de rota. Eles são completamente distintos dos middlewares de servidor (`server/middleware/`), que executam no servidor Nitro a cada requisição HTTP.

## Tipos de Middleware de Rota

1. **Middleware Nomeado (`app/middleware/auth.ts`)**: Carregado sob demanda via import assíncrono apenas nas páginas que o referenciam em `definePageMeta({ middleware: 'auth' })`.
2. **Middleware Global (`app/middleware/01.analytics.global.ts`)**: Possui o sufixo `.global.ts` e é executado automaticamente em **toda mudança de rota**.
3. **Middleware Inline (Anônimo)**: Definido diretamente dentro de `definePageMeta` na página.

## Ordem de Execução

1. **Middlewares Globais** (em ordem alfabética de string pelo nome do arquivo).
2. **Middlewares definidos na página** (na ordem declarada no array `middleware: [...]`).

Para controlar a ordem dos middlewares globais, utilize numeração com zero à esquerda (`01.`, `02.`):

```text
app/middleware/
├── 01.setup.global.ts       # Executa primeiro em todas as rotas
├── 02.analytics.global.ts   # Executa em seguida em todas as rotas
├── auth.ts                  # Executa apenas quando referenciado na página
└── role-admin.ts            # Referenciado como 'role-admin'
```

## Regras de Criação de Arquivos

1. **Nomenclatura e Escaneamento**:
   - O nome do middleware é normalizado para **kebab-case** (`roleAdmin.ts` ou `role-admin.ts` → `'role-admin'`). Prefira criar os arquivos já em **kebab-case** (`auth.ts`, `guest-only.ts`).
   - Apenas arquivos no nível raiz de `app/middleware/` (ou arquivos `index.ts` dentro de subdiretórios, como `app/middleware/auth/index.ts`) são registrados pelo Nuxt.
   - Sempre envolva a função exportada com `export default defineNuxtRouteMiddleware((to, from) => { ... })`.
2. **Valores de Retorno Permitidos**:
   - Diferente do `vue-router` tradicional, **não existe o terceiro parâmetro `next()`**. O controle da navegação é feito pelo retorno da função:
     - `return` (ou sem retorno): Permite que a navegação prossiga normalmente.
     - `return navigateTo('/login')`: Redireciona para a rota indicada (código `302` padrão no SSR, ou `navigateTo('/login', { redirectCode: 301 })`).
     - `return abortNavigation()`: Interrompe a navegação atual.
     - `return abortNavigation(createError({ status: 403, statusText: 'Acesso negado' }))`: Rejeita a navegação com um erro.
3. **Proibido Usar `useRoute()` Dentro de Middlewares**:
   - Em um middleware de rota, não existe o conceito de "rota atual consolidada" até a navegação terminar. **Sempre utilize os parâmetros `(to, from)`** recebidos pelo `defineNuxtRouteMiddleware`.
   - Caso invoque uma função auxiliar ou composable dentro do middleware, passe `to` como argumento para essa função em vez de chamar `useRoute()` dentro dela.

## Exemplo de Uso

```ts
// app/middleware/auth.ts
export default defineNuxtRouteMiddleware((to) => {
  const isAuthenticated = useState<boolean>('is-authenticated', () => false)

  if (!isAuthenticated.value && to.path !== '/login') {
    return navigateTo({
      path: '/login',
      query: { redirect: to.fullPath },
    })
  }
})
```

Uso na página (`app/pages/perfil.vue`):

```vue
<script setup lang="ts">
definePageMeta({
  middleware: ['auth'],
})
</script>
```

## Boas Práticas

- **Evite Loops Infinitos de Redirecionamento**: Sempre verifique `to.path` antes de chamar `navigateTo()`, especialmente em middlewares `.global.ts`.
- **Execução no Servidor e no Cliente (SSR + Hidratação)**: No carregamento inicial de uma página renderizada no servidor, o middleware executa no servidor e novamente no cliente durante a hidratação. Se precisar pular a execução em um dos ambientes, verifique `import.meta.server`, `import.meta.client` ou `nuxtApp.isHydrating && nuxtApp.payload.serverRendered`.
