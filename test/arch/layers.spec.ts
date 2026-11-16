import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { relative, resolve } from 'node:path'
import { cruise, type IConfiguration } from 'dependency-cruiser'
import { describe, expect, it } from 'vitest'

const ROOT_DIR = resolve(import.meta.dirname, '../..')
const requireConfig = createRequire(import.meta.url)
const depcruiseConfig = requireConfig('../../.dependency-cruiser.cjs') as IConfiguration

function collectFilesFromAbs(dirPath: string, pattern: RegExp): string[] {
  if (!existsSync(dirPath)) {
    return []
  }

  const results: string[] = []
  for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = resolve(dirPath, entry.name)
    if (entry.isDirectory()) {
      results.push(...collectFilesFromAbs(fullPath, pattern))
    } else if (entry.isFile() && pattern.test(entry.name)) {
      results.push(relative(ROOT_DIR, fullPath).replaceAll('\\', '/'))
    }
  }
  return results
}

function collectFiles(relativeDir: string, pattern: RegExp): string[] {
  return collectFilesFromAbs(resolve(ROOT_DIR, relativeDir), pattern).sort()
}

function readRepoFile(relativePath: string): string {
  return readFileSync(resolve(ROOT_DIR, relativePath), 'utf8')
}

function hasSharedSchemaValidation(content: string): boolean {
  const importsSharedSchema = /#shared\/schemas\//.test(content)
  const validatesInput = /(readValidatedBody|getValidatedQuery|getValidatedRouterParams)\s*\(/.test(
    content,
  )
  return importsSharedSchema && validatesInput
}

function getForbiddenRule(name: string) {
  const rule = depcruiseConfig.forbidden?.find((item) => item.name === name)
  if (!rule) {
    throw new Error(`Regra obrigatória ausente em .dependency-cruiser.cjs: ${name}`)
  }
  return rule
}

function matchesPattern(pattern: unknown, value: string): boolean {
  return typeof pattern === 'string' && new RegExp(pattern).test(value)
}

function extractSummary(output: unknown): { error: number; warn: number } | null {
  if (!output || typeof output !== 'object' || !('summary' in output)) {
    return null
  }
  const summary = (output as { summary: { error: number; warn: number } }).summary
  return { error: summary.error, warn: summary.warn }
}

describe('Arquitetura de Camadas e Contratos (dependency-cruiser + análise estática)', () => {
  it('não possui violações nem warnings de dependência entre app, server e shared', async () => {
    const result = await cruise(['app', 'server', 'shared'], depcruiseConfig)
    const summary = extractSummary(result.output)

    expect(summary).toEqual({ error: 0, warn: 0 })
  })

  it('impõe regras explícitas para isolamento de camadas, Drizzle ORM e componentes', () => {
    const apiViaServices = getForbiddenRule('api-via-services')
    const onlyReposDrizzle = getForbiddenRule('only-repos-access-drizzle')
    const servicesNotToApi = getForbiddenRule('services-not-to-api')
    const reposNotToServices = getForbiddenRule('repos-not-to-services')
    const sharedIsPure = getForbiddenRule('shared-is-pure')
    const componentsNoDirectIo = getForbiddenRule('components-no-direct-io')

    expect(matchesPattern(apiViaServices.from.path, 'server/api/trips/index.get.ts')).toBe(true)
    expect(matchesPattern(apiViaServices.to.path, 'server/repositories/trip.repository.ts')).toBe(
      true,
    )

    expect(matchesPattern(onlyReposDrizzle.from.path, 'server/services/trip.service.ts')).toBe(true)
    expect(
      matchesPattern(onlyReposDrizzle.from.path, 'server/repositories/trip.repository.ts'),
    ).toBe(false)
    expect(matchesPattern(onlyReposDrizzle.to.path, 'server/database/client.ts')).toBe(true)
    expect(matchesPattern(onlyReposDrizzle.to.path, 'node_modules/drizzle-orm/index.js')).toBe(true)
    expect(
      matchesPattern(onlyReposDrizzle.to.path, 'node_modules/better-sqlite3/lib/index.js'),
    ).toBe(true)

    expect(servicesNotToApi.from.path).toBe('^server/services')
    expect(reposNotToServices.from.path).toBe('^server/repositories')
    expect(matchesPattern(sharedIsPure.to.path, 'node_modules/drizzle-orm/index.js')).toBe(true)
    expect(matchesPattern(sharedIsPure.to.path, 'node_modules/vue/index.js')).toBe(true)

    expect(matchesPattern(componentsNoDirectIo.from.path, 'app/components/trips/Table.vue')).toBe(
      true,
    )
    expect(matchesPattern(componentsNoDirectIo.to.path, 'app/composables/useApiFetch.ts')).toBe(
      true,
    )
  })

  it('exige validação Zod com #shared/schemas/ nos handlers de mutação e entrada em server/api', () => {
    const mutationHandlers = collectFiles('server/api', /\.(post|put|patch)\.ts$/)
    const unvalidatedMutationHandlers = mutationHandlers.filter(
      (filePath) => !hasSharedSchemaValidation(readRepoFile(filePath)),
    )

    expect(unvalidatedMutationHandlers).toEqual([])
    expect(hasSharedSchemaValidation(readRepoFile('server/api/health.get.ts'))).toBe(true)
    expect(
      hasSharedSchemaValidation(
        'export default defineEventHandler(async (event) => readBody(event))',
      ),
    ).toBe(false)
  })

  it('proíbe declaração direta de z.object( em app/ e server/ fora de shared/schemas/', () => {
    const sourceFiles = [...collectFiles('app', /\.(ts|vue)$/), ...collectFiles('server', /\.ts$/)]
    const violations = sourceFiles.filter((filePath) =>
      /\bz\.object\s*\(/.test(readRepoFile(filePath)),
    )

    expect(violations).toEqual([])
  })
})
