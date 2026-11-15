/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'no-orphans',
      severity: 'error',
      from: {
        orphan: true,
        pathNot: [
          '\\.d\\.ts$',
          '\\.schemas\\.ts$',
          '(^|/)app/(app|error|app\\.config)\\.(vue|ts)$',
          '(^|/)(pages|layouts|middleware|plugins|composables|stores|utils|types|api|routes)/',
          '(^|/)shared/http/index\\.ts$',
          '\\.(test|spec)\\.ts$',
          'nuxt\\.config',
        ],
      },
      to: {},
    },
    {
      name: 'app-not-to-server',
      severity: 'error',
      from: { path: '^app' },
      to: { path: '^server' },
    },
    {
      name: 'server-not-to-app',
      severity: 'error',
      from: { path: '^server' },
      to: { path: '^app' },
    },
    {
      name: 'shared-is-pure',
      severity: 'error',
      from: { path: '^shared' },
      to: { path: '^(app|server)' },
    },
    {
      name: 'api-via-services',
      severity: 'error',
      from: { path: '^server/(api|routes)' },
      to: { path: '^server/repositories' },
    },
    {
      name: 'repos-not-to-services',
      severity: 'error',
      from: { path: '^server/repositories' },
      to: { path: '^server/services' },
    },
    {
      name: 'components-no-direct-io',
      severity: 'error',
      from: { path: '^app/components' },
      to: { path: '^(app/pages|shared/(http|lib))' },
    },
    {
      name: 'no-dev-deps-in-prod',
      severity: 'error',
      from: { path: '^(app|server|shared)', pathNot: '\\.(test|spec)\\.ts$' },
      to: { dependencyTypes: ['npm-dev'] },
    },
  ],
  options: {
    tsConfig: { fileName: '.nuxt/tsconfig.app.json' },
    doNotFollow: { path: 'node_modules' },
  },
}
