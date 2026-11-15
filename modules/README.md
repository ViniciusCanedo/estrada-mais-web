# Diretório `modules/`

O diretório `modules/` é utilizado para criar e registrar automaticamente **módulos locais do Nuxt** desenvolvidos especificamente para estender o comportamento de build, configuração ou runtime da aplicação.

> Documentação oficial: [Nuxt 4 — `modules`](https://nuxt.com/docs/4.x/directory-structure/modules) | [Module Author Guide](https://nuxt.com/docs/4.x/guide/modules)

## Quando Usar `modules/` vs. `layers/` vs. `app/plugins/`

- **`modules/`**: Executam em **tempo de build/inicialização do Nuxt** usando o `nuxt/kit` (`defineNuxtModule`). Ideais para gerar arquivos virtuais, injetar rotas ou componentes programaticamente, configurar plugins do Vite/Nitro ou integrar ferramentas externas em tempo de compilação.
- **`layers/`**: Para dividir domínios da aplicação (páginas, componentes, composables e APIs) usando a estrutura padrão de pastas do Nuxt.
- **`app/plugins/`**: Executam apenas em **tempo de execução (runtime)** quando a instância Vue é criada.

## Como os Arquivos São Escaneados

O Nuxt registra automaticamente arquivos que seguem os padrões:

- `modules/*.ts`
- `modules/*/index.ts`

Não é necessário adicioná-los manualmente ao array `modules` do `nuxt.config.ts` (a menos que você queira passar opções customizadas para o módulo).

```text
modules/
├── 1.analytics/
│   ├── index.ts                     # Definição do módulo com defineNuxtModule
│   └── runtime/
│       ├── app/
│       │   └── components/          # Componentes injetados pelo módulo (type-checked em app)
│       └── server/
│           └── api-route.ts         # Handlers Nitro injetados pelo módulo
└── 2.feature-flags.ts               # Módulo simples em arquivo único
```

## Ordem de Execução

1. Primeiro são carregados os módulos listados no array `modules` do `nuxt.config.ts`.
2. Em seguida, os módulos encontrados em `modules/` são executados em **ordem alfabética**.
3. Use prefixos numéricos (`01.primeiro/`, `02.segundo.ts`) se a ordem de execução entre módulos locais for importante.

## Regras de Criação de Arquivos

1. **Uso de `defineNuxtModule` e `nuxt/kit`**:
   - Todo módulo deve exportar por padrão `defineNuxtModule({ meta: { name: '...' }, setup(options, nuxt) { ... } })`.
   - Importe utilitários diretamente de `'nuxt/kit'` (`createResolver`, `addComponent`, `addComponentsDir`, `addImports`, `addServerHandler`, `addPlugin`) — não é necessário instalar `@nuxt/kit` separadamente no `package.json`.
2. **Isolamento do Diretório `runtime/`**:
   - Código que roda em tempo de execução (componentes, composables, plugins, rotas de servidor) **nunca** deve ser importado diretamente no `index.ts` do módulo.
   - Coloque arquivos de runtime da aplicação Vue dentro de `modules/<seu-modulo>/runtime/app/` para garantir que recebam a checagem de tipos correta do Nuxt 4.
   - Resolva caminhos sempre com `createResolver(import.meta.url)`.

## Exemplo de Módulo Local

```ts
// modules/hello/index.ts
import { addComponentsDir, addServerHandler, createResolver, defineNuxtModule } from 'nuxt/kit'

export default defineNuxtModule({
  meta: {
    name: 'hello-module',
    configKey: 'hello',
  },
  setup() {
    const resolver = createResolver(import.meta.url)

    addServerHandler({
      route: '/api/hello',
      handler: resolver.resolve('./runtime/server/api-hello'),
    })

    addComponentsDir({
      path: resolver.resolve('./runtime/app/components'),
      pathPrefix: true,
    })
  },
})
```

## Boas Práticas

- **Sempre defina `meta.name` e `meta.configKey`**: Isso permite identificar o módulo no Nuxt DevTools e configurar opções via `nuxt.config.ts`.
- **Prefixe recursos injetados**: Ao registrar componentes, composables ou rotas de servidor a partir de um módulo, utilize prefixos claros para evitar colisões com o código principal em `app/` e `server/`.
