# Monorepo Docker build
# Build context: project root (docker build -f apps/backend/Dockerfile .)

# --- Stage 1: Install all dependencies ---
FROM node:22-slim AS deps
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile

# --- Stage 2: Install prod dependencies only ---
FROM node:22-slim AS prod-deps
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile --prod --ignore-scripts \
    && mkdir -p apps/backend/node_modules packages/shared/node_modules

# --- Stage 3: Build ---
FROM node:22-slim AS build
RUN corepack enable
WORKDIR /app

COPY --from=deps /app/ ./
COPY apps/backend/ ./apps/backend/
COPY packages/shared/ ./packages/shared/
RUN pnpm --filter @nomad-pilot/backend build

# --- Stage 4: Production ---
FROM node:22-slim AS production
WORKDIR /app

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=prod-deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=build /app/apps/backend/dist ./apps/backend/dist
COPY package.json ./

ENV NODE_ENV=production
EXPOSE ${PORT:-3000}

CMD ["node", "apps/backend/dist/main.js"]
