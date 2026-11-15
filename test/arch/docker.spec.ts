import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT_DIR = resolve(import.meta.dirname, '../..')

function readProjectFile(relativePath: string): string {
  return readFileSync(resolve(ROOT_DIR, relativePath), 'utf8')
}

describe('Infraestrutura Docker de Produção', () => {
  it('deve possuir .dockerignore protegendo arquivos sensíveis e artefatos locais', () => {
    const dockerignorePath = resolve(ROOT_DIR, '.dockerignore')

    expect(existsSync(dockerignorePath)).toBe(true)

    const content = readProjectFile('.dockerignore')
    expect(content).toContain('node_modules')
    expect(content).toContain('.nuxt')
    expect(content).toContain('.output')
    expect(content).toContain('.env')
  })

  it('deve definir build multi-stage com node:24-bookworm-slim, usuário não-root e healthcheck em docker/prod/Dockerfile', () => {
    const dockerfilePath = resolve(ROOT_DIR, 'docker/prod/Dockerfile')

    expect(existsSync(dockerfilePath)).toBe(true)

    const content = readProjectFile('docker/prod/Dockerfile')
    expect(content).toContain('FROM node:24-bookworm-slim AS build')
    expect(content).toContain('FROM node:24-bookworm-slim AS runner')
    expect(content).toContain('USER node')
    expect(content).toContain('http://localhost:3000/api/health')
    expect(content).toContain('CMD ["node", ".output/server/index.mjs"]')
  })

  it('deve configurar o serviço de produção em docker-compose.prod.yml apontando para docker/prod/Dockerfile', () => {
    const composePath = resolve(ROOT_DIR, 'docker-compose.prod.yml')

    expect(existsSync(composePath)).toBe(true)

    const content = readProjectFile('docker-compose.prod.yml')
    expect(content).toContain('image:')
    expect(content).toContain('NODE_ENV: production')
    expect(content).toContain('http://localhost:3000/api/health')
    expect(content).toContain('restart: unless-stopped')
  })
})
