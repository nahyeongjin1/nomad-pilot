# --- Stage 1: Install dependencies ---
FROM node:22-slim AS deps
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# --- Stage 2: Build ---
FROM node:22-slim AS build
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# --- Stage 3: Production ---
FROM node:22-slim AS production
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY --from=build /app/dist ./dist

ENV NODE_ENV=production
EXPOSE ${PORT:-3000}

CMD ["node", "dist/main.js"]