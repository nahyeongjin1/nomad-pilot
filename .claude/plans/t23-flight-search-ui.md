# T23: 항공편 검색 화면

## Context

- **선행 태스크**: T06a (Amadeus + Travelpayouts 연동 ✅), T22 (도시 탐색 화면 ✅)
- **목표**: 도시 카드의 "항공편 검색" 버튼 → 유연한 날짜 검색 → 결과 리스트 → 외부 딥링크 예약 + 항공편 저장
- **라우트**: `/flights/:cityId`

## 논의 결과 요약

1. **Kiwi Tequila 탈락**: 2024년부터 초대 기반 파트너십으로 전환. 가입 페이지 존재하나 실제 상호작용 불가. Skyscanner API도 파트너 승인 필요(5,000 UV). Google ITA Matrix는 공개 API 없음
2. **Amadeus 단독 + Skyscanner 위젯 보완**: Amadeus로 앱 내 검색 경험 제공 + Skyscanner 위젯으로 커버리지 보완
3. **출발지**: ICN + GMP 백엔드 통합 검색 (2회 병렬 호출 → merge), 프론트에서 필터 칩으로 필터링
4. **시기 선택**: "이번 주말"(금-토/금-일/토-일), "다음 주말", 월 선택(3~6개월)
5. **기간 선택**: n박 (1박~4박+)
6. **딥링크**: Aviasales(Travelpayouts) 기존 방식 유지. 새 탭(`target="_blank"`)으로 열기
7. **항공편 저장**: "예약하기" 클릭 시 항공편 정보를 "내 여행"에 자동 저장 + 동시에 딥링크 열기. 실제 예약 확인은 사용자 수동 체크
8. **검색 폼 UX**: 검색 후 폼 접힘 (다시 열기 가능)
9. **빈 결과 처리**: Amadeus 결과 0건 → "검색 결과가 없습니다" + Skyscanner 위젯 크게 노출
10. **Amadeus 환경**: MVP에서는 test 환경 유지, 점진적 production 전환

---

## 기술 결정

### Amadeus 유연한 검색 전략

Amadeus는 정확한 날짜(`departureDate` + `returnDate`)만 받으므로, 백엔드에서 날짜 조합을 생성하여 병렬 호출:

| 시기 선택         | 기간                    | 날짜 조합 | API 호출 수 (×2 출발지) |
| ----------------- | ----------------------- | --------- | ----------------------- |
| 이번 주말 + 2박   | 금→일 / 토→월           | 2         | 4                       |
| 다음 주말 + 1~2박 | 금1박/금2박/토1박/토2박 | 4         | 8                       |
| 4월 + 2박         | 매주 금/토 출발         | ~8~10     | ~16~20                  |

- 월 선택 시 매주 금/토 출발 기준으로 제한 (모든 날짜 조합은 비현실적)
- 결과를 가격순 정렬 후 merge, 중복 제거
- **캐싱**: 동일 조건 검색 30분~1시간 TTL. 초기 트래픽 적어 무료 쿼터 문제 없음

### Skyscanner 위젯

- **타입**: Simple Flight Search Widget (최소 250px 너비)
- **임베드**: `<div data-skyscanner-widget="SearchWidget">` + data attributes
- **프리필**: 도착 공항 자동 설정 + 출발지 기본 ICN (GMP 필터 선택 시 GMP)
- **배치**: 검색 결과 리스트 하단 / 빈 결과 시 상단에 크게 노출
- **수익화**: MVP에서는 트래킹 없이 위젯만 노출. 5,000 UV 달성 후 Impact affiliate 신청 → 트래킹 코드 교체

### 응답 DTO

```typescript
// FlightOfferDto (기존 확장)
{
  id: string;                    // itinerary ID
  currency: string;              // 'KRW'
  totalPrice: number;
  originAirport: string;         // 'ICN' | 'GMP' (필터링 키)
  destinationAirport: string;    // 'NRT'
  nightsInDest: number | null;   // 숙박 일수 (returnDate - departureDate)
  itineraries: ItineraryDto[];   // 기존 구조 유지
  airlines: string[];
  deepLink: string;              // Aviasales 딥링크
}
```

---

## 엔드포인트 설계

### 기존 엔드포인트 유지 (하위 호환)

| 엔드포인트                     | 변경사항                                                      |
| ------------------------------ | ------------------------------------------------------------- |
| `GET /flights/search`          | 기존 Amadeus 정확한 날짜 검색 유지                            |
| `GET /flights/cheapest-cities` | 기존 유지                                                     |
| `GET /flights/lowest-prices`   | 기존 유지 (Travelpayouts, 데이터 부족하지만 당장 교체 불필요) |

### 신규 엔드포인트

```text
GET /flights/flexible-search
```

**Query Parameters:**

| 파라미터      | 타입   | 필수 | 기본값    | 설명                                       |
| ------------- | ------ | ---- | --------- | ------------------------------------------ |
| `origins`     | string | N    | `ICN,GMP` | 쉼표 구분 출발 공항                        |
| `destination` | string | Y    | -         | 도시 ID (UUID) → 백엔드에서 IATA 코드 변환 |
| `dateFrom`    | string | Y    | -         | 출발 시작일 (YYYY-MM-DD)                   |
| `dateTo`      | string | Y    | -         | 출발 종료일 (YYYY-MM-DD)                   |
| `nightsFrom`  | number | Y    | -         | 최소 숙박                                  |
| `nightsTo`    | number | Y    | -         | 최대 숙박                                  |
| `adults`      | number | N    | `1`       | 성인 수                                    |
| `maxResults`  | number | N    | `20`      | 최대 결과 수                               |

**프론트 → 백엔드 변환 예시:**

- "이번 주말 + 2박" → `dateFrom=2026-03-13&dateTo=2026-03-15&nightsFrom=2&nightsTo=2`
- "4월 + 2~3박" → `dateFrom=2026-04-01&dateTo=2026-04-30&nightsFrom=2&nightsTo=3`

**백엔드 내부 처리:**

```text
1. destination(cityId) → DB에서 iataCodes 조회 (예: ["NRT","HND"])
2. origins 파싱 (예: ["ICN","GMP"])
3. dateFrom~dateTo 범위에서 출발 날짜 목록 생성 (주말: 금/토, 월: 매주 금/토)
4. 각 (origin, destination, departureDate, returnDate) 조합에 대해 Amadeus 검색
5. Promise.allSettled로 병렬 호출 → 성공 결과만 수집
6. 가격순 정렬 → maxResults 제한 → 응답
```

---

## 프론트엔드 화면 구성

### 검색 폼 (`/flights/:cityId`)

```text
┌──────────────────────────────────┐
│  ← 뒤로    도쿄 항공편 검색       │
│                                  │
│  출발지: 인천(ICN) + 김포(GMP)    │
│                                  │
│  ── 시기 ──                      │
│  [이번 주말] [다음 주말]          │
│  [3월] [4월] [5월] [6월]         │
│                                  │
│  ── 기간 ──                      │
│  [1박] [2박] [3박] [4박+]        │
│                                  │
│  [검색하기]                       │
└──────────────────────────────────┘
```

### 결과 리스트 (폼 접힘 후)

```text
┌──────────────────────────────────┐
│  도쿄 항공편  [검색 조건 수정 ▼]  │
│                                  │
│  필터: [전체] [ICN] [GMP]         │
│                                  │
│  ┌────────────────────────────┐  │
│  │ ₩125,000        대한항공   │  │
│  │ 3/14(금)→3/16(일)  2박    │  │
│  │ ICN → NRT  직항 2h30m     │  │
│  │            [예약하기 →]    │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ ₩138,000         진에어    │  │
│  │ 3/15(토)→3/16(일)  1박    │  │
│  │ GMP → HND  직항 2h15m     │  │
│  │            [예약하기 →]    │  │
│  └────────────────────────────┘  │
│  ...                             │
│                                  │
│  ┌────────────────────────────┐  │
│  │  🔍 Skyscanner에서 더 보기  │  │
│  │  [Skyscanner 위젯]         │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

### "예약하기" 버튼 동작

1. 항공편 정보를 로컬 저장소(또는 Trip)에 저장
2. 동시에 `window.open(deepLink, '_blank')`로 Aviasales 페이지 열기
3. 저장된 항공편에 "예약 확인" 체크는 사용자 수동

### 빈 결과 시

```text
┌──────────────────────────────────┐
│  검색 결과가 없습니다             │
│  조건을 변경하거나 Skyscanner에서 │
│  검색해보세요.                   │
│                                  │
│  ┌────────────────────────────┐  │
│  │  [Skyscanner 위젯 - 크게]  │  │
│  │  origin: ICN               │  │
│  │  dest: NRT                 │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

### 프론트 컴포넌트 구조

```text
routes/_app/flights/$cityId.tsx      ← 메인 페이지 (TanStack Router)
├── components/flight-search-form.tsx
│   ├── PeriodSelector (시기 프리셋 + 월 선택)
│   └── NightsSelector (박수 선택)
├── components/flight-result-card.tsx
├── components/origin-filter.tsx     ← 전체/ICN/GMP 필터 칩
├── components/skyscanner-widget.tsx  ← Skyscanner 위젯 래퍼
├── hooks/use-flight-search.ts       ← TanStack Query mutation
└── lib/date-utils.ts                ← 프리셋 → dateFrom/dateTo 변환
```

### Skyscanner 위젯 origin 로직

- 필터 "GMP" 선택 → `data-origin-iata-code="GMP"`
- 그 외 모든 경우 (전체, ICN) → `data-origin-iata-code="ICN"`

### TanStack Query 전략

- **검색**: `useMutation` (사용자가 "검색하기" 클릭 시 실행)
- **도시 정보**: `useQuery` (cityId로 도시명/공항코드 조회, staleTime: Infinity)
- 결과 캐싱: queryClient에 수동 저장 (`queryClient.setQueryData`)

---

## 백엔드 모듈 구조

```text
src/flights/
├── flights.controller.ts          ← flexible-search 엔드포인트 추가
├── flights.service.ts             ← 날짜 조합 생성 + Amadeus 병렬 호출 + merge
├── services/
│   ├── amadeus.service.ts         ← 기존 유지
│   ├── deeplink.service.ts        ← 기존 유지
│   └── travelpayouts.service.ts   ← 기존 유지
├── dto/
│   ├── flexible-search.dto.ts     ← 신규: 유연한 검색 파라미터
│   ├── flight-offer.dto.ts        ← originAirport, nightsInDest 필드 추가
│   └── ... (기존 DTO 유지)
└── utils/
    └── date-combinations.ts       ← 날짜 범위 → 개별 날짜 조합 생성
```

---

## 구현 순서

| #   | 태스크                                                  | 상태 | 주요 파일                |
| --- | ------------------------------------------------------- | ---- | ------------------------ |
| 0   | 브랜치 생성 `feat/t23-flight-search`                    | ✅   | -                        |
| 1   | FlightOfferDto 확장 (originAirport, nightsInDest)       | ✅   | `flight-offer.dto.ts`    |
| 2   | 날짜 조합 생성 유틸 (범위 → 개별 날짜 목록)             | ✅   | `date-combinations.ts`   |
| 3   | FlexibleSearchDto 생성                                  | ✅   | `flexible-search.dto.ts` |
| 4   | FlightsService flexible-search 로직 (병렬 호출 + merge) | ✅   | `flights.service.ts`     |
| 5   | FlightsController flexible-search 엔드포인트 추가       | ✅   | `flights.controller.ts`  |
| 6   | 백엔드 테스트 (API 호출 검증)                           | ✅   | -                        |
| 7   | 프론트: 라우트 + 페이지 셸 (`/flights/:cityId`)         | ✅   | `$cityId.tsx`            |
| 8   | 프론트: 검색 폼 (시기/기간 셀렉터)                      | ✅   | `flight-search-form.tsx` |
| 9   | 프론트: 날짜 변환 유틸 (프리셋 → dateFrom/dateTo)       | ✅   | `date-utils.ts`          |
| 10  | 프론트: TanStack Query 훅 (`useFlightSearch`)           | ✅   | `use-flight-search.ts`   |
| 11  | 프론트: 결과 카드 + 리스트                              | ✅   | `flight-result-card.tsx` |
| 12  | 프론트: 출발지 필터 (전체/ICN/GMP)                      | ✅   | `origin-filter.tsx`      |
| 13  | 프론트: 로딩/에러/빈 결과 상태                          | ✅   | `$cityId.tsx`            |
| 14  | 프론트: Skyscanner 위젯 (하단 + 빈 결과 시)             | ✅   | `skyscanner-widget.tsx`  |
| 15  | 프론트: "예약하기" → 항공편 저장 + 딥링크 열기          | ✅   | `flight-result-card.tsx` |
| 16  | 도시 카드 버튼 → `/flights/:cityId` 연결                | ✅   | `city-card.tsx`          |
| 17  | 검색 폼 접힘/펼침 UX                                    | ✅   | `$cityId.tsx`            |
| 18  | SW 런타임 캐싱 (flight search: NetworkFirst)            | ✅   | `vite.config.ts`         |
| 19  | 계획서/ADR/task-tracker 업데이트                        | ✅   | -                        |

---

## 주의사항

- **Amadeus production 전환 신청 완료** (2026-03-13): 최대 72시간 대기. 승인 후 `AMADEUS_BASE_URL` + credentials 교체만 필요 (코드 변경 없음). test 환경은 시뮬레이션 데이터라 Aviasales 딥링크 가격 정합성 문제 있었음
- **캐싱 필수**: 동일 조건 재검색 시 API 호출 절약. 30분~1시간 TTL
- **Skyscanner 위젯**: affiliate 미가입 상태에서도 동작. 수익은 5,000 UV 달성 후 Impact 가입 시 발생
- **항공편 저장**: MVP에서는 로컬 저장소 사용. Trip 엔티티 연동은 일정 기능(T12 등) 구현 시 확장
