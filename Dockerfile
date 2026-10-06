# syntax=docker/dockerfile:1
# Pakto web app. `docker build --build-arg NEXT_PUBLIC_APP_URL=https://pakto.net -t pakto-app .`
FROM node:24-bookworm-slim AS base
RUN npm install -g pnpm@11.21.0 && pnpm --version
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# The landing video (video/) is its own workspace package: only its manifest is needed, so the lockfile matches.
COPY video/package.json video/package.json
RUN --mount=type=cache,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile --filter pakto

FROM base AS build
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# `next build` loads server modules to collect page data; nothing connects or signs anything at build time.
# These placeholders live in this stage only: the runner image gets the real values from the environment.
# .next/cache survives between builds on the same machine. CI builds outside Docker and uses Dockerfile.prebuilt.
RUN --mount=type=cache,target=/app/.next/cache DATABASE_URL=postgres://build:build@localhost:5432/build BETTER_AUTH_SECRET=build-only-placeholder PORTAL_LINK_SECRET=build-only-placeholder pnpm build

FROM node:24-bookworm-slim AS runner
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 FILES_DIR=/data/files
WORKDIR /app
RUN groupadd --system --gid 1001 pakto && useradd --system --uid 1001 --gid pakto pakto \
  && mkdir -p /data/files && chown pakto:pakto /data/files
COPY --from=build --chown=pakto:pakto /app/.next/standalone ./
COPY --from=build --chown=pakto:pakto /app/.next/static ./.next/static
COPY --from=build --chown=pakto:pakto /app/public ./public
USER pakto
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
