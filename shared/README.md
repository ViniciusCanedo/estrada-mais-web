# Diretório `shared/`

O diretório `shared/` permite compartilhar código, utilitários, constantes, schemas de validação Zod e tipos TypeScript **entre a aplicação Vue (`app/`) e o servidor Nitro (`server/`)**.

> Documentação oficial: [Nuxt 4 — `shared`](https://nuxt.com/docs/4.x/directory-structure/shared)

## Estrutura e Auto-importação

```text
shared/
├── schemas/                # Schemas Zod isomórficos — importáveis via '#shared/schemas/*'
│   ├── common.schema.ts
│   └── health.schema.ts
├── types/                  # Constantes e tipos de domínio (auto-importado na raiz)
│   └── domain.ts
└── utils/                  # Utilitários puros e conversores (auto-importado na raiz)
    └── units.ts
```

- **Auto-importados**: Apenas os arquivos localizados diretamente no nível raiz de `shared/utils/` e `shared/types/` são auto-importados automaticamente em `app/` e `server/`.
- **Importação Manual (`#shared`)**: Schemas em `shared/schemas/` são importados explicitamente via `#shared/schemas/<dominio>.schema`.

## Regras de Criação de Arquivos

1. **Regra de Ouro (Zero Dependências de Vue, Nitro, Node ou Drizzle)**:
   - O código dentro de `shared/` **não pode importar nada** de `app/`, `server/`, Vue/Nuxt, Nitro, `drizzle-orm`, `better-sqlite3` ou APIs exclusivas do Node.js.
   - Deve ser 100% agnóstico de ambiente (isomórfico/universal).
2. **Nomenclatura**:
   - Utilize **kebab-case** para nomes de arquivos e pastas (`<dominio>.schema.ts`).
