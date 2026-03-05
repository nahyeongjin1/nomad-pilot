# T15b: 레이아웃 + 디자인 시스템 (shadcn/ui + Tailwind)

## Context

T15a(프론트 셋업) 완료 후, 실제 화면 작업(T21 도시 탐색, T22 항공편 검색) 전에 공통 레이아웃과 디자인 시스템 기반을 구축한다. ADR에서 결정된 바텀 네비 4탭 구조, Pretendard JP 폰트, Teal 브랜드 컬러를 구현한다.

**ADR 결정사항:**

- 바텀 네비 4탭: 탐색 / 플래닝 / 내 여행 / 마이
- 탐색: 도시 중심 구조 (도시 상세에서 항공|POI|숙소 스와이프 탭)
- 폰트: Pretendard JP (oklch, tnum)
- 포인트 컬러: Teal 600 기반 oklch, 80% opacity
- 다크모드: MVP 제외 (라이트만)
- shadcn/ui 컴포넌트: 필요할 때마다 추가 (`npx shadcn@latest add <component>`)
- 아이콘: lucide-react (shadcn/ui 기본 아이콘 라이브러리, `components.json` iconLibrary: "lucide")

## 구현 순서

| 단계 | 작업                                   | 주요 파일                                   |
| ---- | -------------------------------------- | ------------------------------------------- |
| 0    | 브랜치 생성 + task-tracker 🔄          | -                                           |
| 1    | 디자인 토큰 (폰트 + 컬러) + 프리커넥트 | `src/index.css`, `index.html`               |
| 2    | 앱 레이아웃 셸 + 바텀 네비             | `src/components/layout/`                    |
| 3    | 라우트 구조 (4탭 + 레이아웃 라우트)    | `src/routes/`                               |
| 4    | 각 탭 placeholder 페이지               | `src/routes/_app/`                          |
| 5    | 브라우저 검증 + 테스트                 | -                                           |
| 6    | 문서 업데이트 + task-tracker ✅        | `CLAUDE.md`, ADR, `apps/frontend/CLAUDE.md` |

## 단계별 상세

### 단계 0: 초기 설정

- 이 계획서를 `.claude/plans/t15b-layout-design.md`에 복사
- `feat/t15b-layout-design` 브랜치 생성
- task-tracker T15b → 🔄

### 단계 1: 디자인 토큰 (폰트 + 컬러)

#### 1-a. Pretendard JP 폰트 등록

**Tailwind CSS v4 공식 패턴** ([font-family docs](https://tailwindcss.com/docs/font-family), [@theme docs](https://tailwindcss.com/docs/theme)):

`src/index.css` 수정 — `@import url(...)` 은 반드시 `@import "tailwindcss"` **앞에** 위치 (브라우저 CSS @import 순서 규칙):

```css
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-jp-dynamic-subset.min.css');
@import 'tailwindcss';
@import 'tw-animate-css';
/* ... 기존 코드 ... */
```

`@theme inline` 블록에 폰트 오버라이드 추가 (기존 `@theme inline` 블록 확장):

```css
@theme inline {
  /* 기존 color/radius 변수들 유지 */

  /* Pretendard JP — 한글+일본어+영문 통합 가변 폰트 */
  --font-sans:
    'Pretendard JP Variable', 'Pretendard JP', ui-sans-serif, system-ui,
    sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji';
  --font-sans--font-feature-settings: 'tnum'; /* 숫자 고정폭 (가격 표시용) */
}
```

- `--font-sans` 오버라이드 → Tailwind `font-sans` 유틸리티가 Pretendard JP로 매핑
- `--font-sans--font-feature-settings: 'tnum'` → 숫자 tabular figures (가격/날짜 정렬)
- `@layer base` 블록의 `body`에 `font-sans` 추가하여 전역 적용

#### 1-b. 폰트 CDN 프리커넥트

`index.html` `<head>`에 dns-prefetch + preconnect 추가 (폰트 로딩 최적화):

```html
<link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
<link
  rel="preconnect"
  crossorigin="anonymous"
  href="https://cdn.jsdelivr.net"
/>
```

#### 1-c. 폰트 오프라인 캐싱 (T15c 연계)

T15c(PWA 기초 설정)에서 vite-plugin-pwa 설정 시, **Workbox runtimeCaching**으로 jsDelivr 폰트 파일 캐싱:

```typescript
// T15c에서 구현 — 여기서는 패턴만 문서화
VitePWA({
  workbox: {
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'pretendard-font-cache',
          expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
    ],
  },
});
```

→ T15b에서는 **preconnect + CSS @import**만 구현. SW 캐싱은 T15c 범위.

#### 1-d. 브랜드 컬러 (Teal oklch)

shadcn/ui 테마 패턴 준수 — `:root`에 CSS 변수 정의, `@theme inline`에서 매핑:

`:root` 블록에 Teal 기반 `--primary` 교체 + `--brand-*` 팔레트 추가:

```css
:root {
  /* 기존 변수 유지, primary만 Teal로 교체 */
  --primary: oklch(0.637 0.137 175.8); /* Teal 600 */
  --primary-foreground: oklch(0.985 0 0); /* 흰색 */

  /* 브랜드 팔레트 (참조용) */
  --brand-50: oklch(0.953 0.051 180.8);
  --brand-100: oklch(0.916 0.089 180.1);
  --brand-200: oklch(0.855 0.138 181.1);
  --brand-300: oklch(0.777 0.152 181.9);
  --brand-400: oklch(0.702 0.143 180);
  --brand-500: oklch(0.658 0.136 177.1);
  --brand-600: oklch(0.637 0.137 175.8); /* 기본 */
  --brand-700: oklch(0.536 0.114 176.9);
  --brand-800: oklch(0.465 0.096 177.7);
  --brand-900: oklch(0.405 0.078 178.4);
  --brand-950: oklch(0.311 0.06 179.6);
  /* ... 기존 변수 계속 ... */
}
```

`@theme inline` 블록에 브랜드 컬러 매핑 추가:

```css
@theme inline {
  /* 기존 매핑 유지 */
  --color-brand-50: var(--brand-50);
  --color-brand-100: var(--brand-100);
  /* ... 50~950 전체 ... */
  --color-brand-950: var(--brand-950);
}
```

→ Tailwind에서 `bg-brand-600`, `text-brand-500` 등으로 사용 가능
→ 80% opacity 사용: `bg-brand-600/80` (Tailwind opacity modifier)

### 단계 2: 앱 레이아웃 셸 + 바텀 네비

아이콘은 **lucide-react** 사용 (shadcn/ui 공식 아이콘 라이브러리, 이미 설치됨).

생성할 컴포넌트:

**`src/components/layout/bottom-nav.tsx`:**

- 4개 탭: 탐색(Compass), 플래닝(Map), 내 여행(CalendarCheck2), 마이(User)
- `import { Compass, Map, CalendarCheck2, User } from 'lucide-react'`
- TanStack Router `<Link>` 사용, 현재 라우트 활성 표시 (활성: `text-brand-600`, 비활성: `text-muted-foreground`)
- 모바일 safe-area 대응 (`pb-[env(safe-area-inset-bottom)]`)
- 고정 위치 하단 (`fixed bottom-0 inset-x-0`)
- 배경: `bg-background border-t border-border`

**`src/components/layout/app-header.tsx`:**

- 앱 이름 "Nomad Pilot" 표시
- 심플한 구조 (MVP)
- `h-14 border-b border-border bg-background`

**`src/components/layout/app-layout.tsx`:**

- 헤더 + 메인 콘텐츠 영역 + 바텀 네비 조합
- 메인 영역에 `<Outlet />` (TanStack Router) 렌더링
- 바텀 네비 높이만큼 하단 패딩 (`pb-16`)

### 단계 3: 라우트 구조

TanStack Router 파일 기반 라우팅으로 레이아웃 라우트 구성:

```text
src/routes/
├── __root.tsx          # 기존 유지 (QueryClientProvider + DevTools)
├── _app.tsx            # 패스리스 레이아웃 라우트 → AppLayout 렌더링
├── _app/
│   ├── index.tsx       # / → 탐색 홈
│   ├── planning.tsx    # /planning → 플래닝
│   ├── trips.tsx       # /trips → 내 여행
│   └── my.tsx          # /my → 마이
├── index.tsx           # 기존 파일 → 삭제 (_app/index.tsx로 이동)
└── index.test.tsx      # 기존 테스트 → 경로 수정
```

**`_app.tsx`** (패스리스 레이아웃 라우트):

- `createFileRoute('/_app')` 사용
- `component`에서 `AppLayout` 렌더링
- URL에 `_app` 세그먼트 노출 안 됨

### 단계 4: 각 탭 placeholder 페이지

각 탭에 심플한 placeholder 컴포넌트:

- lucide-react 아이콘 + 탭 이름 표시
- 향후 T21, T22 등에서 실제 구현으로 교체

### 단계 5: 브라우저 검증 + 테스트

- `pnpm dev:fe` → localhost:5173 접속
- Pretendard JP 폰트 적용 확인 (DevTools → Elements → Computed → font-family)
- 바텀 네비 4탭 표시 + 탭 전환 동작
- 각 탭 라우팅 정상 작동 (`/`, `/planning`, `/trips`, `/my`)
- 브랜드 컬러(Teal) 바텀 네비 활성 탭에 적용
- tnum 폰트 피처 확인 (숫자 정렬)
- `pnpm lint` 통과
- `pnpm build` 성공
- `pnpm test:fe` 통과 (스모크 테스트 수정)

### 단계 6: 문서 업데이트

**`apps/frontend/CLAUDE.md`** 추가 내용:

- **아이콘:** lucide-react 사용 (shadcn/ui 공식 아이콘 라이브러리). `import { IconName } from 'lucide-react'`
- **폰트:** Pretendard JP Variable (CDN, `@theme --font-sans` 오버라이드). tnum 기본 활성
- **컬러:** Teal 600 기반 브랜드 컬러. `bg-brand-600`, `text-brand-500` 등
- **레이아웃:** `_app.tsx` 패스리스 레이아웃 라우트 → `AppLayout` (헤더 + 바텀 네비)
- **라우트 구조:** `_app/index.tsx`(/), `_app/planning.tsx`, `_app/trips.tsx`, `_app/my.tsx`
- **shadcn/ui 컴포넌트 추가:** `npx shadcn@latest add <component>` (components.json 설정 완료)

기타:

- task-tracker T15b → ✅

## 수정 대상 파일 목록

| 파일                                                 | 작업                                              |
| ---------------------------------------------------- | ------------------------------------------------- |
| `apps/frontend/src/index.css`                        | 폰트 import, @theme 폰트/컬러, :root primary 교체 |
| `apps/frontend/index.html`                           | preconnect/dns-prefetch 추가                      |
| `apps/frontend/src/components/layout/bottom-nav.tsx` | **신규** — 바텀 네비                              |
| `apps/frontend/src/components/layout/app-header.tsx` | **신규** — 앱 헤더                                |
| `apps/frontend/src/components/layout/app-layout.tsx` | **신규** — 레이아웃 셸                            |
| `apps/frontend/src/routes/_app.tsx`                  | **신규** — 패스리스 레이아웃 라우트               |
| `apps/frontend/src/routes/_app/index.tsx`            | **신규** — 탐색 홈                                |
| `apps/frontend/src/routes/_app/planning.tsx`         | **신규** — 플래닝                                 |
| `apps/frontend/src/routes/_app/trips.tsx`            | **신규** — 내 여행                                |
| `apps/frontend/src/routes/_app/my.tsx`               | **신규** — 마이                                   |
| `apps/frontend/src/routes/index.tsx`                 | **삭제** (\_app/index.tsx로 이동)                 |
| `apps/frontend/src/routes/index.test.tsx`            | 경로 수정                                         |
| `apps/frontend/CLAUDE.md`                            | 아이콘/폰트/컬러/레이아웃/라우트 컨벤션 추가      |
| `.claude/docs/task-tracker.md`                       | T15b 상태 업데이트                                |

## 검증 방법

1. `pnpm dev:fe` → 바텀 네비 4탭 표시, 탭 전환 정상
2. Pretendard JP 폰트 렌더링 확인 (한글 + 일본어 + 숫자)
3. 브랜드 컬러(Teal) 바텀 네비 활성 탭에 적용
4. 각 라우트 직접 URL 접속 정상 (`/`, `/planning`, `/trips`, `/my`)
5. `pnpm lint` + `pnpm build` + `pnpm test:fe` 모두 통과

## 주의사항

- `@import url(...)` 은 반드시 `@import "tailwindcss"` 앞에 위치 (브라우저 CSS @import 순서 규칙) — [Tailwind v4 공식 문서](https://tailwindcss.com/docs/font-family)
- `@theme inline` 사용 이유: CSS 변수(`var(--font-sans)`)를 참조하므로 `inline` 필수 — [Tailwind v4 @theme 문서](https://tailwindcss.com/docs/theme)
- `--font-sans--font-feature-settings` 은 Tailwind v4 공식 서브 프로퍼티 문법 — `@theme` 블록에서 `--font-{name}--font-feature-settings` 형식
- shadcn/ui 테마 패턴: `:root`에 CSS 변수 정의 → `@theme inline`에서 `--color-*`로 매핑 (기존 `index.css` 패턴 유지)
- 폰트 오프라인 캐싱(SW runtimeCaching)은 T15c 범위. T15b에서는 preconnect + CSS import만 — [vite-plugin-pwa runtimeCaching 문서](https://vite-pwa-org.netlify.app/workbox/generate-sw)
- `_app.tsx`는 패스리스 레이아웃 라우트 — URL에 노출되지 않음
- 기존 `src/routes/index.tsx` 삭제 후 `_app/index.tsx`로 이동 (라우트 충돌 방지)
- `routeTree.gen.ts`는 라우트 파일 변경 시 자동 재생성
- 다크모드 관련 CSS 변수는 기존 shadcn/ui 세팅에 남겨두되, 토글 UI는 구현하지 않음
