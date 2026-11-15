# Diretório `shared/`

O diretório `shared/` permite compartilhar código, utilitários, constantes, schemas de validação e tipos TypeScript **entre a aplicação Vue (`app/`) e o servidor Nitro (`server/`)**.

> Documentação oficial: [Nuxt 4 — `shared`](https://nuxt.com/docs/4.x/directory-structure/shared)

## Por que `shared/` Existe?

O Nuxt 4 compila dois bundles independentes: o bundle da aplicação Vue (`app/`) e o bundle do servidor Nitro (`server/`), cada um com seu próprio contexto de execução e de TypeScript:

- `app/` não pode importar código de `server/`.
- `server/` não pode importar código de `app/`.
- **`shared/`** possui seu próprio contexto TypeScript (`.nuxt/tsconfig.shared.json`) referenciado tanto por `app/` quanto por `server/`, atuando como a única ponte segura entre os dois ambientes.

## Estrutura e Auto-importação

```text
shared/
├── http/
│   ├── api.schemas.ts      # ⚠️ Gerado pelo Orval — importável via '#shared/http/api.schemas'
│   └── system/system.ts    # ⚠️ Gerado pelo Orval — importável via '#shared/http/system/system'
├── lib/
│   └── client.ts           # ⚠️ Mutator isomórfico do Orval ('#shared/lib/client')
├── types/
│   └── api.ts              # ✅ Auto-importado em app/ e server/
├── utils/
│   └── validators.ts       # ✅ Auto-importado em app/ e server/
└── constants/
    └── roles.ts            # ⚠️ Importável manualmente via '#shared/constants/roles'
```

- **Auto-importados**: Apenas os arquivos localizados diretamente no nível raiz de `shared/utils/` e `shared/types/` são auto-importados automaticamente em `app/` e `server/`.
- **Importação Manual (`#shared`)**: Qualquer outro arquivo na raiz de `shared/` ou em subpastas (ex.: `shared/constants/roles.ts` ou `shared/utils/nested/helper.ts`) deve ser importado explicitamente utilizando o alias `#shared`:
  ```ts
  import { USER_ROLES } from '#shared/constants/roles'
  ```

## Regras de Criação de Arquivos

1. **Regra de Ouro (Zero Dependências de Vue ou Nitro)**:
   - O código dentro de `shared/` **não pode importar absolutamente nada de Vue/Nuxt App** (`ref`, `computed`, `useNuxtApp`, `useRoute`, componentes `.vue`) **nem nada exclusivo do Nitro/Node Server** (`defineEventHandler`, `H3Event`, `node:fs`, `node:crypto` restrito, segredos de servidor).
   - O código em `shared/` deve ser 100% agnóstico de ambiente (isomórfico/universal), capaz de rodar tanto no navegador quanto no runtime do servidor.
2. **Nomenclatura**:
   - Utilize **kebab-case** para nomes de arquivos e pastas.

## Boas Práticas

- **Contratos de API e Schemas**: Coloque DTOs de requisição/resposta em `shared/types/` e schemas de validação isomórficos (ex.: Zod) ou validadores em `shared/utils/` para reaproveitar a mesma validação no formulário do cliente (`app/`) e no endpoint da API (`server/api/`).
- **Testes Unitários Rápidos**: Por não depender nem do Vue nem do Nitro, todo o código de `shared/` pode ser testado diretamente em `test/unit/` no ambiente Node puro.
