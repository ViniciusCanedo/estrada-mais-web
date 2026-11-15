# Diretório `server/routes/`

O diretório `server/routes/` armazena **rotas de servidor sem o prefixo `/api`**. Enquanto arquivos em `server/api/` são expostos sob `/api/*`, os arquivos criados em `server/routes/` são registrados diretamente a partir da raiz `/` da aplicação.

> Documentação oficial: [Nuxt 4 — Server Routes (`server/routes`)](https://nuxt.com/docs/4.x/directory-structure/server#server-routes)

## Quando Usar `server/routes/` vs. `server/api/`

- **`server/routes/`**: Para rotas técnicas ou públicas na raiz do domínio que não devem conter `/api` na URL, como:
  - Feeds dinâmicos (`/rss.xml`, `/feed.xml`, `/atom.xml`)
  - Sitemaps dinâmicos (`/sitemap.xml`)
  - Endpoints de monitoramento de infraestrutura (`/healthz`, `/readyz`, `/metrics`)
  - Redirecionamentos curtos ou callbacks de terceiros na raiz (`/webhooks/...`, `/oauth/callback`)
- **`server/api/`**: Para todos os endpoints de dados consumidos pelo frontend ou clientes externos sob `/api/*`.

## Regras de Criação de Arquivos

1. **Nomenclatura e Sufixo de Método HTTP**:
   - Utilize **kebab-case** e inclua o sufixo do método HTTP quando aplicável (`.get.ts`, `.post.ts`).
   - Exemplo: `server/routes/healthz.get.ts` expõe `GET /healthz`.
   - Exemplo com extensão no nome da rota: `server/routes/sitemap.xml.get.ts` expõe `GET /sitemap.xml`.
2. **Conflito com `app/pages/` e `public/`**:
   - **Atenção**: Rotas em `server/routes/` compartilham o espaço de URLs da raiz `/` com `app/pages/` e `public/`. Nunca crie uma rota em `server/routes/` com o mesmo caminho de uma página em `app/pages/` (a menos que seja intencional responder no nível do servidor antes do Vue Router).
3. **Exportação Padrão**:
   - Sempre exporte o handler usando `export default defineEventHandler((event) => { ... })`.

## Exemplo de Uso

```ts
// server/routes/healthz.get.ts
export default defineEventHandler((event) => {
  setResponseHeader(event, 'cache-control', 'no-store')

  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
  }
})
```

## Boas Práticas

- **Defina o `Content-Type` em respostas não-JSON**: Ao gerar XML, texto puro ou binários (ex.: `sitemap.xml.get.ts`), defina explicitamente o cabeçalho com `setResponseHeader(event, 'content-type', 'application/xml; charset=utf-8')`.
- **Prefira `server/api/` por padrão**: Só adicione arquivos em `server/routes/` quando a ausência do prefixo `/api` for um requisito real da URL.
