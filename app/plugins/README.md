# Diretório `app/plugins/`

O diretório `app/plugins/` contém os plugins da aplicação que são lidos e registrados automaticamente pelo Nuxt 4 durante a criação da instância da aplicação Vue (`nuxtApp`).

> Documentação oficial: [Nuxt 4 — `plugins`](https://nuxt.com/docs/4.x/directory-structure/app/plugins)

## Como os Arquivos São Escaneados

Apenas arquivos na **raiz** de `app/plugins/` são auto-registrados pelo Nuxt:

```text
app/plugins/
├── 01.api.ts               # ✅ Escaneado (executa no servidor e no cliente)
├── 02.analytics.client.ts  # ✅ Escaneado (executa apenas no cliente)
├── ssr-logger.server.ts    # ✅ Escaneado (executa apenas no servidor)
└── helpers/
    └── custom.ts           # ❌ Não escaneado (a menos que listado em nuxt.config.ts)
```

## Regras de Criação de Arquivos

1. **Nomenclatura e Sufixos de Ambiente**:
   - Utilize **kebab-case** ou **camelCase** precedido opcionalmente por numeração com zero à esquerda (`01.`, `02.`) quando a ordem de execução importar.
   - Utilize o sufixo **`.client.ts`** para plugins que dependem de APIs exclusivas do navegador (`window`, `document`, `localStorage`).
   - Utilize o sufixo **`.server.ts`** para plugins que devem rodar exclusivamente durante a renderização no servidor.
   - **Nota sobre ordenação**: Como os nomes são ordenados alfabeticamente como strings, sempre use zero à esquerda (`01.`, `02.`, ..., `10.`) para evitar que `10.` execute antes de `2.`.
2. **Sintaxe de Objeto para Otimização e Paralelismo**:
   - Por padrão, plugins rodam sequencialmente. Prefira a **sintaxe de objeto** em `defineNuxtPlugin({ ... })` com `parallel: true` sempre que o plugin não bloquear os próximos, permitindo carregamento paralelo e análise estática de hooks em tempo de build.
   - Caso um plugin dependa de outro, declare `dependsOn: ['nome-do-outro-plugin']` na sintaxe de objeto.
   - As propriedades da sintaxe de objeto (`name`, `enforce`, `parallel`, `hooks`, `env`) são analisadas estaticamente no build — nunca as defina condicionalmente em runtime.

## Exemplo de Plugin (Sintaxe de Objeto Recomendada)

```ts
// app/plugins/01.http-client.ts
export default defineNuxtPlugin({
  name: 'http-client',
  parallel: true,
  setup() {
    const config = useRuntimeConfig()

    const api = $fetch.create({
      baseURL: config.public.apiBaseUrl as string,
    })

    return {
      provide: {
        api,
      },
    }
  },
})
```

## Boas Práticas

- **Prefira `app/composables/` em vez de `provide` sempre que possível**: Injetar muitos helpers globais via `provide` (`$meuHelper`) polui o namespace global do `nuxtApp` e aumenta o bundle inicial (pois plugins rodam antes de qualquer página). Use plugins apenas para registrar bibliotecas Vue (`nuxtApp.vueApp.use(...)`), diretivas (`nuxtApp.vueApp.directive(...)`), interceptadores globais ou hooks de ciclo de vida.
- **Diretivas Vue e SSR**: Se registrar uma diretiva customizada (`vueApp.directive`), registre-a tanto no cliente quanto no servidor (fornecendo `getSSRProps` ou um stub `.server.ts` se a diretiva manipular apenas o DOM).
- **Cuidado com Composables dentro de Plugins**: Composables chamados dentro de um plugin não têm acesso ao ciclo de vida de componentes Vue (`onMounted`, `onUnmounted`) e não enxergam plugins registrados posteriormente na fila.
