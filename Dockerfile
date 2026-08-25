# syntax=docker/dockerfile:1.7
FROM node:22-bookworm-slim@sha256:d649c27dae7ba0137b3cef5dd75baa422c08dc3d9e3fc0c23dfb172dc3cc6436 AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates openssl && rm -rf /var/lib/apt/lists/* \
    && corepack enable
WORKDIR /app

FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts \
    && rm -rf /root/.cache/pnpm /pnpm/store

FROM dependencies AS build
COPY . .
RUN pnpm prisma generate && pnpm build

FROM dependencies AS initializer
RUN apt-get update && apt-get install -y --no-install-recommends default-mysql-client && rm -rf /var/lib/apt/lists/*
COPY prisma ./prisma
COPY scripts ./scripts
RUN pnpm prisma generate
CMD ["sh", "scripts/initialize.sh"]

FROM dependencies AS backup
RUN apt-get update && apt-get install -y --no-install-recommends default-mysql-client openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY scripts ./scripts

FROM dependencies AS worker
ENV NODE_ENV=production
COPY . .
RUN pnpm prisma generate
USER node
CMD ["pnpm", "worker"]

FROM node:22-bookworm-slim@sha256:d649c27dae7ba0137b3cef5dd75baa422c08dc3d9e3fc0c23dfb172dc3cc6436 AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates openssl && rm -rf /var/lib/apt/lists/* \
    && groupadd --system --gid 1001 nuxt && useradd --system --uid 1001 --gid nuxt nuxt
COPY --from=build --chown=nuxt:nuxt /app/.output ./.output
USER nuxt
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
