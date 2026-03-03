# Frontend (apps/frontend)

> Vite + React 19 + TypeScript SPA

## 기술 스택

- **빌드:** Vite 7, TypeScript 5.9
- **라우팅:** TanStack Router (파일 기반, autoCodeSplitting)
- **서버 상태:** TanStack Query (offlineFirst, staleTime 5min)
- **스타일:** Tailwind CSS v4 + shadcn/ui (new-york style)
- **HTTP:** ky
- **테스트:** Vitest 4 + React Testing Library + jsdom

## 개발 명령어

```bash
pnpm dev:fe              # Vite dev (localhost:5173)
pnpm build:fe            # tsc + vite build
pnpm test:fe             # Vitest run
pnpm -F @nomad-pilot/frontend test:watch  # Vitest watch
```

## 컨벤션

- `@/` alias = `src/` (tsconfig paths + vite resolve alias)
- `VITE_` 접두사 환경변수만 클라이언트 노출 (envDir: 루트)
- `routeTree.gen.ts`는 자동 생성 — ESLint ignore, 수동 수정 금지
- shadcn/ui 컴포넌트 추가: `npx shadcn@latest add <component>`
- 테스트 파일: `*.test.tsx` (src/ 내 co-located)
