import { defineConfig } from 'orval'

export default defineConfig({
  api: {
    input: {
      target: process.env.API_SPEC_PATH || './openapi.json',
    },
    output: {
      mode: 'tags-split',
      target: './shared/http/api.ts',
      client: 'fetch',
      httpClient: 'fetch',
      clean: true,
      override: {
        fetch: {
          includeHttpResponseReturnType: false,
        },
        mutator: {
          path: './shared/lib/client.ts',
          name: 'customFetch',
        },
      },
    },
  },
})
