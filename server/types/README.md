# Diretório `server/types/`

O diretório `server/types/` armazena interfaces, tipos e declarações TypeScript **exclusivos do contexto do servidor Nitro (`server/`)**. Todos os tipos exportados nos arquivos localizados diretamente na raiz deste diretório são **auto-importados** em rotas (`server/api/`, `server/routes/`), middlewares (`server/middleware/`), plugins (`server/plugins/`) e utilitários (`server/utils/`).

> Documentação oficial: [Nuxt 4 — Server Types](https://nuxt.com/docs/4.x/directory-structure/server#server-types)

## Onde Colocar Cada Tipo

| Diretório           | Visibilidade          | Quando Utilizar                                                                                                                                                        |
| :------------------ | :-------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`server/types/`** | Apenas em `server/`   | Entidades internas de banco de dados (com campos sensíveis como `passwordHash`), payloads de serviços internos, extensões de `H3EventContext` e configurações privadas |
| **`shared/types/`** | Em `app/` e `server/` | DTOs de resposta da API, payloads de requisição enviados pelo frontend e tipos de domínio públicos                                                                     |
| **`app/types/`**    | Apenas em `app/`      | Tipos exclusivos de componentes Vue, estados de UI e rotas do cliente                                                                                                  |

## Como os Arquivos São Escaneados

Apenas arquivos localizados **diretamente em `server/types/`** são escaneados automaticamente para auto-importação:

```text
server/types/
├── database.ts         # ✅ Auto-importado em todo o diretório server/
├── h3.d.ts             # ✅ Reconhecido no contexto TypeScript do servidor
└── internal/
    └── queue.ts        # ❌ Subpastas não são auto-importadas (use index.ts ou #server/types/...)
```

## Regras de Criação de Arquivos

1. **Nomenclatura**:
   - Utilize **kebab-case** para nomes de arquivos (`.ts` ou `.d.ts`), como `auth-session.ts`, `database.ts`, `h3.d.ts`.
   - Utilize **PascalCase** para nomes de `interface` e `type`.
2. **Apenas Tipos**:
   - Não inclua código executável (funções, variáveis, classes de runtime) dentro de `server/types/`. Funções e constantes do servidor pertencem a `server/utils/`.

## Exemplos de Uso

### Tipo Auto-importado no Servidor

```ts
// server/types/user-record.ts
export interface DatabaseUserRecord {
  id: string
  email: string
  passwordHash: string
  createdAt: Date
}
```

Uso em `server/api/` ou `server/utils/` sem necessidade de import:

```ts
// server/utils/user-mapper.ts
export function toPublicUser(record: DatabaseUserRecord) {
  return {
    id: record.id,
    email: record.email,
  }
}
```

### Estendendo `H3EventContext`

```ts
// server/types/h3.d.ts
declare module 'h3' {
  interface H3EventContext {
    auth?: {
      userId: string
      roles: string[]
    }
  }
}

export {}
```

## Boas Práticas

- **Proteja Dados Sensíveis por Tipo**: Mantenha os tipos brutos do banco de dados ou integrações externas privadas em `server/types/` e exponha apenas os tipos sanitizados (DTOs públicos) em `shared/types/`.
- **Proibido o uso de `any`**: Utilize sempre tipos estritos ou `unknown` com validação em runtime.
