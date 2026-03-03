# T15a: 프론트 프로젝트 셋업 + Vercel 배포

## Context

T20(CI/CD) 완료 후 프론트엔드 작업 시작. `apps/frontend/`에 빈 placeholder만 존재. 프로젝트 기반을 세팅하고 Vercel에 배포하는 것이 목표. 실제 화면/컴포넌트는 T15b(레이아웃), T21(도시), T22(항공편)에서 구현.

**ADR 결정사항**: Vite SPA, TanStack Router, TanStack Query + 3층 캐싱, shadcn/ui + Tailwind v4, ky, Vitest, vite-plugin-pwa(T15c), Vercel 배포

## 구현 순서

| 단계 | 작업                             | 주요 파일                                                         |
| ---- | -------------------------------- | ----------------------------------------------------------------- |
| 0    | 브랜치 생성 + task-tracker 🔄    | -                                                                 |
| 1    | Vite + React + TS 스캐폴딩       | `apps/frontend/package.json`, `index.html`, `src/main.tsx`        |
| 2    | TypeScript 설정                  | `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`        |
| 3    | TanStack Router (파일 기반)      | `vite.config.ts`, `src/routes/__root.tsx`, `src/routes/index.tsx` |
| 4    | Tailwind v4 + shadcn/ui          | `src/index.css`, `components.json`                                |
| 5    | TanStack Query 프로바이더        | `src/lib/query-client.ts`, `__root.tsx` 수정                      |
| 6    | ky API 클라이언트                | `src/lib/api.ts`                                                  |
| 7    | Vitest 설정                      | `vitest.config.ts`, `src/test/setup.ts`                           |
| 8    | ESLint 업데이트 (mjs→ts + React) | 루트 `eslint.config.ts`                                           |
| 9    | 루트 스크립트 + 환경변수         | 루트 `package.json`, `.env.example`                               |
| 10   | CI 워크플로우 + Vercel 설정      | `.github/workflows/ci-frontend.yml`, `vercel.json`                |
| 11   | CLAUDE.md + 문서 업데이트        | `apps/frontend/CLAUDE.md`, task-tracker ✅                        |

## 단계별 상세

### 단계 0: 초기 설정

- `feat/t15a-frontend-setup` 브랜치 생성
- task-tracker T15a 상태를 🔄로 변경

### 단계 1: Vite + React + TS 스캐폴딩

`apps/frontend/package.json` 재작성 (기존 placeholder 대체):

- `"type": "module"` (Vite ESM 필수. 루트 package.json에는 추가 안 함 — 백엔드 CJS 깨짐)
- scripts: `dev`, `build`, `preview`, `test`, `lint`
- dependencies: `react`, `react-dom`
- devDependencies: `@vitejs/plugin-react`, `vite`, `typescript`, `@types/react`, `@types/react-dom`

생성할 파일:

- `apps/frontend/index.html` — `<div id="root">` + `<script type="module" src="/src/main.tsx">`
- `apps/frontend/src/main.tsx` — React 19 `createRoot` 렌더링
- `apps/frontend/src/vite-env.d.ts` — `/// <reference types="vite/client" />`

검증: `cd apps/frontend && pnpm dev` → localhost:5173 접속

### 단계 2: TypeScript 설정

백엔드 패턴과 동일하게 루트 tsconfig를 extends하지 않고 독립 설정.

- `apps/frontend/tsconfig.json` — solution-style (references: app + node) + `baseUrl`/`paths` (`@/*` alias, shadcn/ui 필수)
- `apps/frontend/tsconfig.app.json` — 브라우저: `target: "ES2020"`, `module: "ESNext"`, `moduleResolution: "bundler"`, `jsx: "react-jsx"`, `noEmit: true`, `strict: true`
- `apps/frontend/tsconfig.node.json` — vite.config.ts용: `target: "ES2022"`, `module: "ESNext"`, `moduleResolution: "bundler"`

`moduleResolution: "bundler"`는 Vite 전용 (nodenext 아님).

### 단계 3: TanStack Router (파일 기반 라우팅)

설치: `@tanstack/react-router`, `@tanstack/router-plugin` (dev)

`apps/frontend/vite.config.ts`:

```ts
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
  ],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  envDir: path.resolve(__dirname, '../..'), // 루트 .env 읽기
});
```

생성할 라우트 파일:

- `src/routes/__root.tsx` — `createRootRoute`, `<Outlet />` 렌더링 (레이아웃은 T15b)
- `src/routes/index.tsx` — `createFileRoute('/')`, "Hello Nomad-Pilot" placeholder
- `src/routeTree.gen.ts` — 플러그인이 자동 생성 (커밋 대상)

`src/main.tsx` 업데이트: `createRouter` + `RouterProvider` 사용

검증: `pnpm dev` → `/`에서 "Hello Nomad-Pilot" 표시

### 단계 4: Tailwind v4 + shadcn/ui

설치: `tailwindcss`, `@tailwindcss/vite`

`vite.config.ts`에 `tailwindcss()` 플러그인 추가 (react() 뒤에).

`src/index.css`: `@import "tailwindcss";` (v4는 CSS import 방식, config 파일 불필요)

`src/main.tsx`에 `import './index.css'` 추가

shadcn/ui 초기화 (`apps/frontend` 디렉토리에서):

```bash
npx shadcn@latest init
```

- `rsc: false` (Vite SPA)
- aliases: `@/components`, `@/lib/utils`, `@/components/ui`
- 자동 생성: `components.json`, `src/lib/utils.ts` (`cn()` 유틸)

검증: index 라우트에 `className="text-blue-500"` 적용 → 파란색 렌더링

주의: shadcn init은 Tailwind 작동 확인 후 실행. v4에서는 `tailwind.config.js` 불필요.

### 단계 5: TanStack Query 프로바이더

설치: `@tanstack/react-query`, `@tanstack/react-query-devtools` (dev)

- `src/lib/query-client.ts` — QueryClient export (기본 `staleTime: 5min`, `gcTime: 30min`, `networkMode: 'offlineFirst'`)
- `src/routes/__root.tsx` 수정 — `<QueryClientProvider>` + `<ReactQueryDevtools />` 래핑

검증: 개발 모드에서 우하단에 React Query Devtools 아이콘 표시

### 단계 6: ky API 클라이언트

설치: `ky`

- `src/lib/api.ts` — `ky.create({ prefixUrl: import.meta.env.VITE_API_URL })` + timeout, retry 설정

### 단계 7: Vitest 설정

설치: `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event` (모두 dev)

- `apps/frontend/vitest.config.ts` — 별도 config (vite.config.ts와 분리, TanStack Router 플러그인 테스트 시 불필요)
  - `environment: 'jsdom'`, `globals: true`, `setupFiles: ['./src/test/setup.ts']`
- `src/test/setup.ts` — `import '@testing-library/jest-dom/vitest'`
- `src/routes/index.test.tsx` — 스모크 테스트

검증: `pnpm test` 통과

### 단계 8: ESLint 업데이트

루트 `eslint.config.mjs` → `eslint.config.ts`로 리네임 (ESLint 9.7+ 네이티브 TS 지원)

추가 설치 (루트): `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`

구조 변경:

```ts
// 공통: recommended + typeChecked + prettier
// Backend 전용: files: ['apps/backend/**'], globals.node + globals.jest
// Frontend 전용: files: ['apps/frontend/**'], globals.browser, react-hooks/react-refresh 플러그인
// 공통 rules: no-explicit-any off, no-floating-promises warn, prettier
```

ignores에 `routeTree.gen.ts` 추가 (자동 생성 파일)

검증: `pnpm lint` — 백엔드/프론트엔드 모두 통과

### 단계 9: 루트 스크립트 + 환경변수

루트 `package.json` scripts 업데이트:

```json
"dev": "concurrently -n be,fe -c blue,green \"pnpm run dev:be\" \"pnpm run dev:fe\"",
"dev:be": "pnpm --filter @nomad-pilot/backend start:dev",
"dev:fe": "pnpm --filter @nomad-pilot/frontend dev",
"build": "pnpm run build:be && pnpm run build:fe",
"build:be": "pnpm --filter @nomad-pilot/backend build",
"build:fe": "pnpm --filter @nomad-pilot/frontend build",
"test": "pnpm run test:be && pnpm run test:fe",
"test:be": "pnpm --filter @nomad-pilot/backend test",
"test:fe": "pnpm --filter @nomad-pilot/frontend test",
"test:e2e": "pnpm --filter @nomad-pilot/backend test:e2e",
"lint": "eslint . --fix",
"format": "prettier --write .",
"prepare": "husky"
```

`concurrently` 루트 devDependency로 추가.

`.env.example`에 추가:

```env
# === Frontend ===
VITE_API_URL=http://localhost:3000/api/v1
```

### 단계 10: CI 워크플로우 + Vercel 설정

`.github/workflows/ci-frontend.yml`:

- 트리거: PR/push to main, paths: `apps/frontend/**`, `packages/shared/**`, lockfile, manifests, `.npmrc`
- steps: checkout → pnpm → node 22 → install → lint → build → test

기존 `.github/workflows/ci.yml` name을 `CI Backend`로 변경 (구분)

`apps/frontend/vercel.json`:

```json
{
  "buildCommand": "cd ../.. && pnpm --filter @nomad-pilot/frontend build",
  "outputDirectory": "dist",
  "installCommand": "cd ../.. && pnpm install --frozen-lockfile",
  "framework": "vite",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

SPA 라우팅을 위한 `rewrites` 규칙 필수 (모든 경로 → index.html).

Vercel 대시보드 (수동):

1. GitHub repo import, Root Directory: `apps/frontend`
2. Environment Variables: `VITE_API_URL=https://<railway-url>/api/v1`

검증: Vercel 배포 후 `https://<project>.vercel.app/` → "Hello Nomad-Pilot"

### 단계 11: CLAUDE.md + 문서 업데이트

`apps/frontend/CLAUDE.md` 생성:

- 기술 스택 요약
- 디렉토리 구조 (`src/routes/`, `src/lib/`, `src/components/`)
- 개발 명령어
- TanStack Router 컨벤션 (파일 기반, routeTree.gen.ts 자동 생성)
- `@/` alias = `src/`
- `VITE_` 접두사 환경변수
- Vitest + React Testing Library

task-tracker: T15a ✅

## 검증 방법

1. `pnpm dev` → 백엔드(3000) + 프론트(5173) 동시 기동
2. `http://localhost:5173/` → "Hello Nomad-Pilot" + Tailwind 스타일 적용
3. React Query Devtools 아이콘 표시
4. `pnpm lint` → 백엔드 + 프론트엔드 모두 통과
5. `pnpm test:fe` → 스모크 테스트 통과
6. PR → CI Frontend 워크플로우 실행 + 통과
7. Vercel 배포 → production URL 접속 확인

## 주의사항

- `"type": "module"`은 `apps/frontend/package.json`에만 추가. 루트에 추가하면 백엔드(CJS) 깨짐
- `routeTree.gen.ts`는 ESLint ignores에 추가 (자동 생성, lint 에러 발생)
- `envDir`로 루트 `.env` 읽을 때 `VITE_` 접두사 변수만 클라이언트에 노출 (보안 OK)
- shadcn init은 Tailwind 작동 확인 후 실행
- `vitest.config.ts`를 `vite.config.ts`와 분리 (TanStack Router 플러그인이 테스트 시 파일 생성 방지)
