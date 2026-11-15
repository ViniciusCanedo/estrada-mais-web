# Diretório `server/`

O diretório `server/` contém todo o código backend da aplicação, executado pelo motor de servidor **[Nitro](https://nitro.build)** e **[h3](https://h3.dev)** com suporte nativo a Hot Module Replacement (HMR) e tipagem ponta a ponta.

> Documentação oficial: [Nuxt 4 — `server`](https://nuxt.com/docs/4.x/directory-structure/server)

## Estrutura do Diretório

```text
server/
├── api/             # Endpoints da API (automaticamente prefixados com /api)
├── middleware/      # Middlewares HTTP executados em todas as requisições do servidor
├── plugins/         # Plugins de ciclo de vida do Nitro (defineNitroPlugin)
├── routes/          # Rotas de servidor sem o prefixo /api (ex.: /healthz, /feed.xml)
├── types/           # Tipos e interfaces TypeScript auto-importados apenas no servidor
└── utils/           # Funções auxiliares auto-importadas apenas no contexto do servidor
```

## Fronteira de Contexto (Nitro vs. Vue App)

O Nuxt compila `server/` e `app/` em **dois bundles independentes** e com contextos TypeScript distintos (`.nuxt/tsconfig.server.json` vs. `.nuxt/tsconfig.app.json`):

- **Proibido importar código de `app/` dentro de `server/`**: Nunca importe componentes Vue, composables (`app/composables/`) ou utilitários de cliente (`app/utils/`) em arquivos do `server/`.
- **Proibido importar código de `server/` dentro de `app/`**: Nunca importe handlers, utilitários ou segredos do servidor no código Vue.
- **Compartilhamento seguro**: Qualquer função utilitária ou tipo que precise existir em ambos os lados deve ser colocado em `shared/utils/` ou `shared/types/`.

## Alias Exclusivo `#server` (Nuxt 4.3+)

Dentro de qualquer arquivo do diretório `server/`, utilize o alias `#server` em vez de caminhos relativos longos (`../../../`):

```ts
// Dentro de server/api/users/[id]/profile.get.ts
import { hashPassword } from '#server/utils/crypto'
```

> **Atenção**: O alias `#server` só pode ser utilizado dentro de `server/`. Importá-lo no código cliente (`app/`) causará erro de build.

## Regras de Criação de Arquivos

1. **Handlers Padrão com `defineEventHandler`**:
   - Todo arquivo em `server/api/`, `server/routes/` e `server/middleware/` deve exportar por padrão uma função definida com `defineEventHandler((event) => { ... })`.
2. **Sufixos de Método HTTP**:
   - Nomeie rotas de API e servidor incluindo o método HTTP no nome do arquivo (`.get.ts`, `.post.ts`, `.put.ts`, `.patch.ts`, `.delete.ts`) para restringir automaticamente o verbo aceito (retornando `405 Method Not Allowed` para outros métodos).
3. **Configurações e Segredos em Runtime**:
   - Sempre passe o objeto `event` ao acessar configurações de ambiente no servidor: `const config = useRuntimeConfig(event)`.
4. **Tratamento Padronizado de Erros**:
   - Utilize `throw createError({ status: 400, statusText: '...' })` para retornar erros HTTP estruturados.

## Boas Práticas

- **Validação de Entrada**: Sempre valide parâmetros de rota (`getValidatedRouterParams`), query strings (`getValidatedQuery`) e corpo da requisição (`readValidatedBody`) utilizando bibliotecas de schema como Zod.
- **Sem `console.log`**: O projeto possui a regra `no-console: error`. Para logging estruturado no servidor, utilize utilitários dedicados ou hooks do Nitro.
