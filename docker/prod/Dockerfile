# Stage 1: Build da aplicação Nuxt 4 / Nitro e compilação de addons nativos
FROM node:24-bookworm-slim AS build

WORKDIR /app

# Dependências de compilação apenas no stage de build para garantir suporte ao addon nativo better-sqlite3
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

RUN npm run build

# Stage 2: Runtime enxuto de produção
FROM node:24-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production \
    NITRO_HOST=0.0.0.0 \
    NITRO_PORT=3000 \
    NUXT_DATABASE_URL=/app/data/estrada.db

# Cria diretório de dados persistentes do SQLite (WAL) pertencente ao usuário não-root
RUN mkdir -p /app/data && chown -R node:node /app/data

COPY --from=build --chown=node:node /app/.output ./.output
COPY --from=build --chown=node:node /app/server/database/migrations ./server/database/migrations
COPY --from=build --chown=node:node /app/package.json ./package.json

USER node

VOLUME ["/app/data"]

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD ["node", "-e", "fetch('http://localhost:3000/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]

CMD ["node", ".output/server/index.mjs"]
