# Diretório `server/plugins/`

O diretório `server/plugins/` armazena os **plugins do servidor Nitro**. O Nuxt lê automaticamente qualquer arquivo neste diretório e o registra na inicialização do servidor para estender o comportamento de runtime do Nitro e interceptar eventos de ciclo de vida.

> Documentação oficial: [Nuxt 4 — Server Plugins](https://nuxt.com/docs/4.x/directory-structure/server#server-plugins) | [Nitro Plugins](https://nitro.build/guide/plugins)

## Casos de Uso Ideais

- Inicializar conexões com bancos de dados, filas ou clientes de cache (Redis) na subida do servidor e encerrá-los graciosamente no hook `close`.
- Interceptar e transformar o HTML renderizado antes de enviá-lo ao cliente (`render:html` / `render:response`).
- Capturar e reportar erros globais não tratados no servidor (`error`).
- Executar rotinas de aquecimento (warmup) na inicialização do Nitro.

## Regras de Criação de Arquivos

1. **Nomenclatura e Ordenação**:
   - Nomeie os arquivos em **kebab-case** (ex.: `database.ts`, `error-tracker.ts`).
   - Caso a ordem de inicialização entre plugins importe, utilize prefixos numéricos com zero à esquerda (`01.database.ts`, `02.cache.ts`).
2. **Uso Obrigatório de `defineNitroPlugin`**:
   - Todo arquivo deve exportar por padrão uma função envolvida em `defineNitroPlugin((nitroApp) => { ... })`.
3. **Execução Única na Inicialização**:
   - O corpo principal do `defineNitroPlugin` é executado **uma única vez** quando o servidor Nitro inicia (e não a cada requisição). Para executar lógica por requisição, registre hooks no `nitroApp.hooks.hook(...)` ou utilize `server/middleware/`.

## Exemplo de Uso

```ts
// server/plugins/01.lifecycle.ts
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    event.context.startedAt = Date.now()
  })

  nitroApp.hooks.hook('error', async (_error, { event }) => {
    if (event) {
      setResponseHeader(event, 'x-error-handled', 'true')
    }
  })

  nitroApp.hooks.hook('close', async () => {
    // Encerrar conexões de banco de dados ou filas com segurança
  })
})
```

## Boas Práticas

- **Limpeza de Recursos (`close` hook)**: Sempre que abrir conexões persistentes ou timers em um plugin do Nitro, registre um listener no hook `'close'` para liberar os recursos durante o desligamento do servidor.
- **Não misture com plugins do Vue**: Plugins em `server/plugins/` não têm acesso a `nuxtApp` ou componentes Vue; eles recebem `nitroApp`.
