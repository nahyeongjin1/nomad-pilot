# T22: 도시 탐색 화면

## Context

T21(Cities API + 최저가 API) 완료 후, 프론트엔드 홈 화면(/)에 도시 탐색 UI를 구현한다. 스택 스와이프 카드로 6개 일본 도시를 탐색하고, 도시별 최저 항공편 가격을 표시한다.

**논의 결과 요약:**

- 레이아웃: 스택 스와이프 카드 (embla-carousel 기반 shadcn Carousel, full-width, 양방향)
- 카드 구성: 이미지 카드(3:4 + max-h 제한) + 카드 아래 도시명/가격/버튼 분리 배치 + Unsplash attribution
- 데이터 페칭: TanStack Query `useQuery` 2개 독립 페칭 (cities 먼저 렌더, 가격은 점진 로딩)
- cities staleTime: Infinity (사실상 정적), lowest-prices staleTime: 30분
- 이미지 최적화: 프론트에서 URL 트랜스폼 (w=640, auto=format). DB 수정 불필요
- SW 런타임 캐싱: cities StaleWhileRevalidate 24h, images CacheFirst 30일, prices NetworkFirst 5s timeout
- 가격 null 처리: "가격 정보 없음" 텍스트 (Travelpayouts 커버리지 한계)
- 도시 정렬: nameKo ASC (가나다순, 백엔드 현행 유지)
- CORS: Vercel preview 대응 프로젝트 한정 RegExp 패턴 추가 (`nomad-pilot-frontend`)
- 도시 tagline: T22 범위 밖, 별도 태스크

## 기술 결정

### 스와이프 카드

- embla-carousel (shadcn/ui Carousel 내부 사용, ~15KB)
- 양방향 스와이프 + 닷 인디케이터
- 브라우저 edge swipe 충돌 방지: 가장자리 ~20px 제외 (embla 내장)
- ~~스와이프 힌트: 스택 peek + 첫 방문 bounce 애니메이션~~ → 미구현 (닷 인디케이터만으로 충분)
- 카드 레이아웃: 이미지 카드(3:4 비율 + `max-h-[calc(100dvh-19rem)]`) + 하단 도시 정보 영역 분리
- 이미지 카드: 사진 + attribution만 (그라디언트 오버레이 제거)
- 카드 아래: 도시명(한/영 인라인) + 가격 + outline 버튼 3개 + `active:scale-95` 터치 피드백

### 이미지

- 프론트 유틸 함수로 Unsplash URL 트랜스폼: `w=1080` → `w=640`, `fm=jpg` → `auto=format`
- 첫 카드: `loading="eager"` + `fetchpriority="high"`, 나머지: `loading="lazy"`
- `index.html`에 `<link rel="preconnect" href="https://images.unsplash.com">` 추가
- 이미지 컨테이너 고정 `aspect-ratio` → CLS 방지
- ~~이미지 위 텍스트 가독성: 하단 그라디언트 오버레이~~ → 텍스트를 카드 밖으로 분리하여 불필요

### Unsplash Attribution

- 이미지 **우하단** 상시 표시 (`text-xs text-white/60`) — 텍스트 카드 밖 분리로 하단 사용 가능
- UTM 링크 조립: `{imageAuthorUrl}?utm_source=nomad_pilot&utm_medium=referral`
- 구현 시 Unsplash 공식 가이드라인 확인 후 정확한 형식 적용

### 비활성 버튼

- 항공편 검색 / POI 탐색 / 여행 계획 버튼 배치
- 탭 시 shadcn Sonner 토스트 "준비 중이에요" (top-center, closeButton 활성)
- Sonner 컴포넌트: `next-themes` 의존성 제거, `theme="light"` 고정 (Vite+React 환경, 다크모드 미지원)
- T23(항공편 검색) 구현 시 해당 버튼 활성화

### 상태 처리

- 로딩: cities 먼저 카드 렌더, 가격은 스켈레톤 (고정 높이 → CLS 방지)
- 에러: "도시 정보를 불러올 수 없습니다" + 재시도 버튼 (2초 throttle)
- 가격 null: "가격 정보 없음" 텍스트
- 오프라인: 상단 배너 "오프라인 상태입니다" + SW 캐시 데이터 있으면 stale 표시

### SW 런타임 캐싱

| 리소스            | 전략                      | TTL  | maxEntries |
| ----------------- | ------------------------- | ---- | ---------- |
| cities API        | StaleWhileRevalidate      | 24h  | 5          |
| Unsplash 이미지   | CacheFirst                | 30일 | 10         |
| lowest-prices API | NetworkFirst (timeout 5s) | 6h   | 5          |

### CORS (백엔드)

- Vercel preview deployment 대응: 프로젝트 한정 RegExp `/^https:\/\/nomad-pilot-frontend(?:-[a-z0-9-]+)*\.vercel\.app$/` (범용 `\.vercel\.app$`는 타 프로젝트 허용 위험)

### 접근성

- embla 기본 a11y 활용 + 부족분 보충
- `aria-roledescription="carousel"`, 좌우 화살표 키, 닷 인디케이터 `aria-label`

## 구현 순서

| 단계 | 작업                                                    | 상태 |
| ---- | ------------------------------------------------------- | ---- |
| 0    | 브랜치 생성 + task-tracker 업데이트                     | ✅   |
| 1    | CORS RegExp 패턴 추가 (백엔드)                          | ✅   |
| 2    | shadcn Carousel + Sonner 컴포넌트 추가                  | ✅   |
| 3    | Unsplash preconnect + 이미지 URL 트랜스폼 유틸          | ✅   |
| 4    | API 타입 + TanStack Query hooks (cities, lowest-prices) | ✅   |
| 5    | 도시 카드 컴포넌트 (이미지 카드 + 하단 정보 분리)       | ✅   |
| 6    | 홈 화면 조립 (스와이프 카드 + 인디케이터)               | ✅   |
| 7    | 비활성 버튼 + 토스트 (top-center, closeButton)          | ✅   |
| 8    | 로딩/에러/오프라인 상태 처리                            | ✅   |
| 9    | SW 런타임 캐싱 규칙 추가 (vite.config.ts)               | ✅   |
| 10   | 테스트 + Lighthouse 확인                                | ✅   |
| 11   | 문서 업데이트 (ADR, task-tracker)                       | ✅   |

## 주요 파일

- `apps/frontend/src/routes/_app/index.tsx` — 홈 화면 (현재 placeholder → 카드 UI 교체)
- `apps/frontend/src/components/` — CityCard, CityCarousel 등 컴포넌트
- `apps/frontend/src/lib/` — API 클라이언트, 이미지 URL 유틸
- `apps/frontend/index.html` — preconnect 추가
- `apps/frontend/vite.config.ts` — SW runtimeCaching 규칙
- `apps/backend/src/main.ts` — CORS RegExp 추가
