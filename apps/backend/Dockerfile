# Monorepo Docker build
# Build context: project root (docker build -f apps/backend/Dockerfile .)

# --- Stage 1: Install dependencies ---
FROM node:22-slim AS deps
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile

# --- Stage 2: Build ---
FROM node:22-slim AS build
RUN corepack enable
WORKDIR /app

COPY --from=deps /app/ ./
COPY apps/backend/ ./apps/backend/
COPY packages/shared/ ./packages/shared/
RUN pnpm --filter @nomad-pilot/backend build

# --- Stage 3: Production ---
FROM node:22-slim AS production
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

COPY --from=build /app/apps/backend/dist ./apps/backend/dist

ENV NODE_ENV=production
EXPOSE ${PORT:-3000}

CMD ["node", "apps/backend/dist/main.js"]
