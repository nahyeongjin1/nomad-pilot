# T15c: PWA 기초 설정 (manifest, SW, 앱 설치)

## Context

T15b(레이아웃+디자인 시스템) 완료 후, 실제 화면 작업 전에 PWA 기반을 구축한다. vite-plugin-pwa로 Service Worker + Web App Manifest를 설정하여 앱 설치와 오프라인 앱 셸 로딩을 가능하게 한다.

**논의 결과 요약:**

- SW 전략: generateSW (zero config, T14 Web Push 시 injectManifest 전환)
- 런타임 캐싱: 현재는 Pretendard JP 폰트(CacheFirst)만. API/이미지 캐싱은 각 화면 구현 시 결정
- registerType: autoUpdate (사용자 개입 없이 자동 업데이트)
- 앱 설치: 브라우저 기본 UI만 (커스텀 설치 프롬프트 없음)
- 오프라인 폴백: navigateFallback으로 앱 셸만 보장. API 실패 UI는 각 화면 범위
- Vercel SW 캐싱: 배포 후 sw.js 응답 헤더 확인, 장기 캐시 시 vercel.json 오버라이드

## 구현 순서

| 단계 | 작업                                                      | 주요 파일                                          |
| ---- | --------------------------------------------------------- | -------------------------------------------------- |
| 0    | 브랜치 생성 + task-tracker 🔄                             | -                                                  |
| 1    | vite-plugin-pwa 설치 + 설정                               | `package.json`, `vite.config.ts`                   |
| 2    | Web App Manifest 설정                                     | `vite.config.ts` (manifest 옵션)                   |
| 3    | Placeholder 아이콘 생성                                   | `public/pwa-192x192.png`, `public/pwa-512x512.png` |
| 4    | index.html meta 태그 추가                                 | `index.html`                                       |
| 5    | SW 등록 (autoUpdate 자동 주입, 선택: 디버깅 시 수동 등록) | `src/vite-env.d.ts`                                |
| 6    | 검증 + 테스트                                             | -                                                  |
| 7    | 문서 업데이트 + task-tracker ✅                           | CLAUDE.md, ADR                                     |

## 단계별 상세

### 단계 0: 초기 설정

- `feat/t15c-pwa-setup` 브랜치 생성
- task-tracker T15c → 🔄

### 단계 1: vite-plugin-pwa 설치 + 설정

`vite-plugin-pwa` 설치:

```bash
pnpm -F @nomad-pilot/frontend add -D vite-plugin-pwa
```

`vite.config.ts`에 VitePWA 플러그인 추가:

```typescript
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: '/',
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'pretendard-font-cache',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1년
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      manifest: {
        /* 단계 2에서 상세 */
      },
    }),
  ],
});
```

### 단계 2: Web App Manifest 설정

VitePWA `manifest` 옵션으로 설정 (별도 파일 불필요, 플러그인이 빌드 시 생성):

```typescript
manifest: {
  name: 'Nomad Pilot',
  short_name: 'Nomad Pilot',
  description: '최저가 일본 자유여행 AI 파일럿',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  theme_color: '#0d9488',
  background_color: '#ffffff',
  categories: ['travel', 'navigation'],
  icons: [
    {
      src: 'pwa-192x192.png',
      sizes: '192x192',
      type: 'image/png',
    },
    {
      src: 'pwa-512x512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any maskable',
    },
  ],
}
```

### 단계 3: Placeholder 아이콘 생성

`public/` 디렉토리에 placeholder PWA 아이콘 생성:

- `public/pwa-192x192.png` — 192x192 placeholder
- `public/pwa-512x512.png` — 512x512 placeholder

Teal 600 배경 + "NP" 텍스트의 간단한 placeholder로 생성. 추후 실제 디자인으로 교체.
`public/favicon.svg`도 동일 스타일로 생성 (Teal 원형 + "NP" 텍스트, 브라우저 탭용).

**아이콘 교체 방법:** `public/pwa-192x192.png`과 `public/pwa-512x512.png`을 동일 이름으로 덮어쓰기만 하면 됨.

### 단계 4: index.html meta 태그 추가

PWA 관련 meta 태그 추가:

```html
<meta name="theme-color" content="#0d9488" />
<meta name="description" content="최저가 일본 자유여행 AI 파일럿" />
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="apple-touch-icon" href="/pwa-192x192.png" />
```

참고: `<link rel="manifest">`는 vite-plugin-pwa가 빌드 시 자동 주입하므로 수동 추가 불필요.

### 단계 5: SW 등록 코드

`registerType: 'autoUpdate'` 사용 시, vite-plugin-pwa가 자동으로 SW 등록 코드를 주입한다. 별도 코드 불필요.

만약 콘솔 로그나 디버깅이 필요하면:

```typescript
// src/pwa.ts (선택적)
import { registerSW } from 'virtual:pwa-register';

registerSW({
  onOfflineReady() {
    console.log('App ready to work offline');
  },
});
```

`virtual:pwa-register` 모듈의 TypeScript 타입을 위해 `vite-plugin-pwa/client` 타입 참조 추가:

```typescript
// src/vite-env.d.ts (기존 파일에 추가)
/// <reference types="vite-plugin-pwa/client" />
```

### 단계 6: 검증 + 테스트

**로컬 검증:**

- `pnpm build:fe` 성공
- `pnpm test:fe` 통과
- `pnpm lint` 통과
- `dist/` 확인: `sw.js`, `manifest.webmanifest`, `workbox-*.js` 생성됨
- `pnpm -F @nomad-pilot/frontend preview` → localhost:4173에서 SW 등록 확인 (DevTools → Application → Service Workers)

**Vercel 배포 후 검증:**

- Chrome DevTools → Application 탭:
  - Service Workers: 등록 + activated 상태
  - Manifest: 아이콘, 이름, 색상 정상
  - Cache Storage: precache + pretendard-font-cache 확인
- Lighthouse PWA audit 실행
- **sw.js 응답 헤더 확인**: Network 탭에서 sw.js의 `Cache-Control` 확인. `max-age`가 긴 경우 `vercel.json` 헤더 오버라이드 필요:

```json
{
  "headers": [
    {
      "source": "/sw.js",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, must-revalidate"
        }
      ]
    }
  ]
}
```

### 단계 7: 문서 업데이트

**`apps/frontend/CLAUDE.md`** 추가:

- **PWA:** vite-plugin-pwa (generateSW, autoUpdate). Precache + jsDelivr CacheFirst
- **아이콘 교체:** `public/pwa-192x192.png`, `public/pwa-512x512.png` 덮어쓰기

**ADR 추가:**

- generateSW + autoUpdate 선택 근거
- 런타임 캐싱: 폰트만 현재, API/이미지는 화면별 결정
- Vercel SW 캐시 헤더: 배포 후 확인 원칙

**task-tracker:** T15c → ✅

## 수정 대상 파일 목록

| 파일                                   | 작업                                  |
| -------------------------------------- | ------------------------------------- |
| `apps/frontend/package.json`           | vite-plugin-pwa devDependency 추가    |
| `apps/frontend/vite.config.ts`         | VitePWA 플러그인 + manifest + workbox |
| `apps/frontend/index.html`             | theme-color, description, icon meta   |
| `apps/frontend/public/pwa-192x192.png` | **신규** — placeholder 아이콘         |
| `apps/frontend/public/pwa-512x512.png` | **신규** — placeholder 아이콘         |
| `apps/frontend/public/favicon.svg`     | **신규** — SVG 파비콘                 |
| `apps/frontend/src/vite-env.d.ts`      | pwa/client 타입 참조 추가             |
| `apps/frontend/CLAUDE.md`              | PWA 컨벤션 추가                       |
| `.claude/docs/adr.md`                  | PWA 설정 결정 기록                    |
| `.claude/docs/task-tracker.md`         | T15c 상태 업데이트                    |

## 주의사항

- vite-plugin-pwa는 dev 서버에서 SW를 등록하지 않음 (빌드 후 preview에서만 동작)
- `registerType: 'autoUpdate'`는 SW 업데이트 시 다음 방문에 적용 (퍼널 도중 강제 리로드 아님)
- `manifest`는 vite.config.ts에서 설정하면 빌드 시 자동 생성됨 (별도 json 파일 불필요)
- `<link rel="manifest">`는 vite-plugin-pwa가 자동 주입 (index.html에 수동 추가 금지)
- Vercel 배포 후 반드시 sw.js의 Cache-Control 헤더 확인
- placeholder 아이콘은 추후 실제 디자인으로 교체 (동일 파일명 덮어쓰기)
