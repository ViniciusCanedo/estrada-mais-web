import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT_DIR = resolve(import.meta.dirname, '../..')

function readProjectFile(relativePath: string): string {
  return readFileSync(resolve(ROOT_DIR, relativePath), 'utf8')
}

describe('Infraestrutura Docker de Produção', () => {
  it('deve possuir .dockerignore protegendo segredos, docs e artefatos SQLite locais', () => {
    const dockerignorePath = resolve(ROOT_DIR, '.dockerignore')

    expect(existsSync(dockerignorePath)).toBe(true)

    const content = readProjectFile('.dockerignore')
    expect(content).toContain('node_modules')
    expect(content).toContain('.nuxt')
    expect(content).toContain('.output')
    expect(content).toContain('.env')
    expect(content).toContain('*.db')
    expect(content).toContain('*.db-wal')
    expect(content).toContain('*.db-shm')
    expect(content).toContain('*.sqlite')
    expect(content).toContain('docs')
    expect(content).toContain('estrada-desktop.html')
  })

  it('deve definir build multi-stage com suporte a better-sqlite3, migrations, volume /app/data e usuário não-root', () => {
    const dockerfilePath = resolve(ROOT_DIR, 'docker/prod/Dockerfile')

    expect(existsSync(dockerfilePath)).toBe(true)

    const content = readProjectFile('docker/prod/Dockerfile')
    expect(content).toContain('FROM node:24-bookworm-slim AS build')
    expect(content).toContain('python3')
    expect(content).toContain('make')
    expect(content).toContain('g++')
    expect(content).toContain('FROM node:24-bookworm-slim AS runner')
    expect(content).toContain('NUXT_DATABASE_URL=/app/data/estrada.db')
    expect(content).toContain('mkdir -p /app/data && chown -R node:node /app/data')
    expect(content).toContain(
      'COPY --from=build --chown=node:node /app/server/database/migrations ./server/database/migrations',
    )
    expect(content).toContain('VOLUME ["/app/data"]')
    expect(content).toContain('USER node')
    expect(content).toContain('http://localhost:3000/api/health')
    expect(content).toContain('CMD ["node", ".output/server/index.mjs"]')
  })

  it('deve configurar docker-compose.prod.yml com volume persistente SQLite e variáveis obrigatórias', () => {
    const composePath = resolve(ROOT_DIR, 'docker-compose.prod.yml')

    expect(existsSync(composePath)).toBe(true)

    const content = readProjectFile('docker-compose.prod.yml')
    expect(content).toContain('image: sistemastvem/estrada-mais-web:latest')
    expect(content).toContain('dockerfile: docker/prod/Dockerfile')
    expect(content).toContain('NODE_ENV: production')
    expect(content).toContain('NUXT_DATABASE_URL:')
    expect(content).toContain('NUXT_APP_SECRET:')
    expect(content).toContain('NUXT_PUBLIC_APP_URL:')
    expect(content).toContain('NUXT_SMTP_HOST:')
    expect(content).toContain('estrada_sqlite_data:/app/data')
    expect(content).toContain('volumes:')
    expect(content).toContain('http://localhost:3000/api/health')
    expect(content).toContain('restart: unless-stopped')
  })
})
