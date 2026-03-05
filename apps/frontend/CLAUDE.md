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

## 디자인 시스템

- **폰트:** Pretendard JP Variable (CDN, `@theme --font-sans` 오버라이드). `tnum` 기본 활성 (가격/날짜 정렬)
- **컬러:** Teal 600 기반 브랜드 컬러. `bg-brand-600`, `text-brand-500`, opacity: `bg-brand-600/80`
- **아이콘:** lucide-react (shadcn/ui 공식). `import { IconName } from 'lucide-react'`
- **다크모드:** MVP 제외 (라이트만)

## 레이아웃 & 라우트

- **레이아웃:** `_app.tsx` 패스리스 레이아웃 라우트 → `AppLayout` (헤더 + 바텀 네비)
- **바텀 네비 4탭:** 탐색(`/`) · 플래닝(`/planning`) · 내 여행(`/trips`) · 마이(`/my`)
- **라우트 구조:** `src/routes/_app/index.tsx`, `planning.tsx`, `trips.tsx`, `my.tsx`

## PWA

- **플러그인:** vite-plugin-pwa (generateSW, autoUpdate)
- **Precache:** `**/*.{js,css,html,ico,png,svg,woff2}` + navigateFallback `/`
- **런타임 캐싱:** jsDelivr CDN (Pretendard JP) CacheFirst 1년
- **아이콘 교체:** `public/pwa-192x192.png`, `public/pwa-512x512.png` 동일 파일명 덮어쓰기
- **주의:** dev 서버에서 SW 미등록. `pnpm preview` 또는 빌드 후 확인

## 컨벤션

- `@/` alias = `src/` (tsconfig paths + vite resolve alias)
- `VITE_` 접두사 환경변수만 클라이언트 노출 (envDir: 루트)
- `routeTree.gen.ts`는 자동 생성 — ESLint ignore, 수동 수정 금지
- shadcn/ui 컴포넌트 추가: `npx shadcn@latest add <component>`
- 테스트 파일: `*.test.tsx` (src/ 내 co-located)
