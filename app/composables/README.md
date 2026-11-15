# Diretório `app/composables/`

O diretório `app/composables/` armazena os **Vue Composables** da aplicação — funções que encapsulam e reutilizam lógica com estado reativo (`ref`, `computed`, `watch`, `useState`, `useFetch`) ou que dependem do contexto do ciclo de vida do Vue/Nuxt. Todos os composables exportados no nível raiz deste diretório são **auto-importados** pelo Nuxt 4 em arquivos `.vue`, `.ts` e `.js` dentro de `app/`.

> Documentação oficial: [Nuxt 4 — `composables`](https://nuxt.com/docs/4.x/directory-structure/app/composables) | [Auto-imports](https://nuxt.com/docs/4.x/guide/concepts/auto-imports)

## Quando Usar `app/composables/` vs. `app/utils/`

- **`app/composables/`**: Funções que utilizam a **Composition API do Vue** (`ref`, `reactive`, `computed`, `onMounted`) ou **composables do Nuxt** (`useState`, `useFetch`, `useAsyncData`, `useRoute`, `useNuxtApp`, `useRuntimeConfig`).
- **`app/utils/`**: Funções auxiliares puras e sem estado reativo (formatação de datas/moedas, cálculos, transformações de dados exclusivas do cliente/app).

## Como os Arquivos São Escaneados

Por padrão, o Nuxt escaneia **apenas arquivos no nível raiz** de `app/composables/`:

```text
app/composables/
├── useAuth.ts          # ✅ Escaneado e auto-importado
├── index.ts            # ✅ Escaneado e auto-importado
└── checkout/
    └── useCart.ts      # ❌ Não escaneado diretamente (re-exporte em index.ts se necessário)
```

Se organizar composables em subpastas, re-exporte-os em `app/composables/index.ts`:

```ts
// app/composables/index.ts
export { useCart } from './checkout/useCart'
```

## Regras de Criação de Arquivos

1. **Nomenclatura**:
   - Todo arquivo e função composable deve iniciar com o prefixo `use` em **camelCase** (ex.: `useAuth.ts`, `useUserPreferences.ts`) ou **kebab-case** para default exports (`use-auth.ts` → exposto como `useAuth()`).
   - Recomenda-se fortemente o uso de `camelCase` no nome do arquivo (`useAuth.ts`) com **named export** (`export const useAuth = () => ...` ou `export function useAuth() { ... }`).
2. **Contexto de Execução Síncrono**:
   - Composables do Vue e do Nuxt dependem da instância ativa do componente ou do `nuxtApp`.
   - **Nunca** invoque composables do Nuxt (`useRuntimeConfig()`, `useNuxtApp()`, `useState()`, `useRoute()`) no escopo global do arquivo (fora da função do composable).
   - **Sempre** chame composables dentro do corpo da função `use*` e de forma síncrona (antes de qualquer `await`, exceto em `<script setup>`, `defineNuxtPlugin` ou `defineNuxtRouteMiddleware`).

## Exemplos de Uso

### ✅ Correto (Named Export + Estado Compatível com SSR)

```ts
// app/composables/useCounter.ts
export function useCounter(initialValue = 0) {
  const count = useState<number>('counter', () => initialValue)
  const doubled = computed(() => count.value * 2)

  function increment() {
    count.value++
  }

  return {
    count: readonly(count),
    doubled,
    increment,
  }
}
```

### ❌ Incorreto (Chamada fora do contexto e poluição de estado em SSR)

```ts
// ❌ ERRO: useRuntimeConfig chamado fora do ciclo de vida do Nuxt
const config = useRuntimeConfig()

// ❌ PERIGO: ref() no escopo do módulo compartilha estado entre requisições diferentes no SSR!
const globalCount = ref(0)

export function useBadComposable() {
  return { config, globalCount }
}
```

## Boas Práticas

- **Segurança em SSR com `useState`**: Nunca declare `ref()` ou `reactive()` fora do escopo da função do composable, pois isso causa vazamento de estado entre diferentes usuários no servidor (Cross-Request State Pollution). Para estado global compartilhado na aplicação, utilize sempre `useState('chave-unica', () => valorInicial)`.
- **Não use `useRoute()` em funções chamadas por Middlewares**: Se um composable puder ser chamado dentro de um route middleware (`app/middleware/`), receba a rota como parâmetro opcional (`route = useRoute()`) em vez de depender exclusivamente de `useRoute()` internamente.
- **Geração de Tipos**: Caso o TypeScript não reconheça um novo composable imediatamente, certifique-se de que `npm run dev` está ativo ou execute `npx nuxt prepare`.
