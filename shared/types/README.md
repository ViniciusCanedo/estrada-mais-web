# Diretório `shared/types/`

O diretório `shared/types/` armazena interfaces, tipos e contratos TypeScript que são **compartilhados entre a aplicação Vue (`app/`) e o servidor Nitro (`server/`)**. Todos os tipos exportados nos arquivos localizados diretamente na raiz de `shared/types/` são **auto-importados em ambos os contextos**.

> Documentação oficial: [Nuxt 4 — `shared` (Type-Only Imports)](https://nuxt.com/docs/4.x/directory-structure/shared#type-only-imports)

## Quando Usar `shared/types/`

Coloque em `shared/types/` qualquer definição de tipo que precise ser conhecida tanto pelo frontend quanto pelo backend:

- Contratos de requisição e resposta da API (DTOs).
- Entidades públicas de domínio (ex.: `User`, `Product`, `PaginatedResponse<T>`).
- Tipos de erros padronizados e códigos de domínio compartilhados.

> **Lembrete**:
>
> - Tipos usados **apenas no frontend** (props de UI, estado visual) pertencem a `app/types/`.
> - Tipos usados **apenas no backend** (modelos internos de banco de dados, contexto do h3) pertencem a `server/types/`.

## Como os Arquivos São Escaneados

Apenas arquivos no **nível raiz** de `shared/types/` são escaneados automaticamente para auto-importação:

```text
shared/types/
├── user.ts             # ✅ Auto-importado em app/ e server/
├── pagination.ts       # ✅ Auto-importado em app/ e server/
└── index.ts            # ✅ Auto-importado (use para re-exportar subpastas, se necessário)
```

## Regras de Criação de Arquivos

1. **Nomenclatura**:
   - Nomeie os arquivos em **kebab-case** (`.ts` ou `.d.ts`), por exemplo: `user.ts`, `api-response.ts`.
   - Nomeie `interface` e `type` em **PascalCase** (`UserProfile`, `PaginatedResult<T>`).
2. **Apenas Definições de Tipos**:
   - Não coloque funções ou constantes de tempo de execução em `shared/types/`. Valores executáveis compartilhados pertencem a `shared/utils/`.
3. **Sem Dependências Específicas de Contexto**:
   - Não referencie tipos exclusivos do Vue (`Component`, `Ref`) nem tipos exclusivos do Nitro/h3 (`H3Event`) dentro de `shared/types/`.

## Exemplo de Uso

```ts
// shared/types/pagination.ts
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}
```

Uso direto no servidor (`server/api/items.get.ts`) e no cliente (`app/pages/index.vue`) sem necessidade de `import`:

```ts
// server/api/items.get.ts
export default defineEventHandler((): PaginatedResponse<string> => {
  return {
    items: ['item-1', 'item-2'],
    total: 2,
    page: 1,
    pageSize: 10,
  }
})
```

## Boas Práticas

- **Evite `import type` cruzando `app/` e `server/`**: Embora `import type` seja removido em tempo de compilação, importar tipos de `server/` em `app/` (ou vice-versa) viola o isolamento dos contextos TypeScript do Nuxt 4. Sempre mova tipos comuns para `shared/types/`.
