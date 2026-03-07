# T21: Cities API (목록 조회 + 이미지 + 최저가)

## Context

T15c(PWA) 완료 후, 프론트엔드 도시 탐색 화면(T22)을 위한 백엔드 API를 구축한다. 도시 목록 조회, 대표 이미지, 날짜 무관 최저가 항공편 가격을 제공한다.

**논의 결과 요약:**

- Cities API와 최저가 API는 별도 엔드포인트로 분리 (캐싱 TTL 상이, 프론트에서 Promise.all)
- 최저가: Travelpayouts v3 `/aviasales/v3/get_latest_prices` 단독 (Amadeus Flight Inspiration Search는 Test 환경 500 에러로 제외)
- 최저가 캐싱: 인메모리 3시간 TTL
- 출발지: ICN + GMP 복수 출발지 지원 (두 공항 조회 후 도시별 최저가 선택)
- 이미지: Unsplash API 스크립트로 로컬 1회 조회 → 마이그레이션에 URL + attribution 하드코딩
- Unsplash attribution 필수: `imageAuthorName` + `imageAuthorUrl` 구조화 필드로 저장
- `iataCityCode` 컬럼 추가: 공항코드(`iataCodes`)와 도시코드 분리. Travelpayouts는 도시코드 반환
- 도시 설명/태그: MVP 제외
- 최저가는 DB 저장 안 함 (휘발성 데이터, 인메모리 캐시만)
- **Travelpayouts 커버리지 한계 확인됨**: 한국발 일본행 데이터 부족 (FUK만). 최저가 소스 추가 검토 필요

## 구현 순서

| 단계 | 작업                                          | 상태 |
| ---- | --------------------------------------------- | ---- |
| 0    | 브랜치 생성 + task-tracker 🔄                 | ✅   |
| 1    | City 엔티티 확장 (이미지 컬럼 + iataCityCode) | ✅   |
| 2    | Unsplash 이미지 조회 스크립트                 | ✅   |
| 3    | 이미지 시드 + iataCityCode 시드 마이그레이션  | ✅   |
| 4    | Cities Controller + Service                   | ✅   |
| 5    | Travelpayouts Data API v3 서비스              | ✅   |
| 6    | ~~Amadeus Flight Inspiration Search~~         | 스킵 |
| 7    | 최저가 API 엔드포인트                         | ✅   |
| 8    | 테스트                                        | ✅   |
| 9    | 문서 업데이트 + task-tracker ✅               | ✅   |

## 단계별 상세

### 단계 0: 초기 설정

- `feat/t21-cities-api` 브랜치 생성
- task-tracker T21 → 🔄
- **Amadeus Flight Inspiration Search 확인 결과:** Test 환경에서 500 에러 반환. fallback 제외, Travelpayouts 단독 사용

### 단계 1: City 엔티티 확장

City 엔티티에 이미지 컬럼 + `iataCityCode` 추가:

```typescript
@Column({ type: 'varchar', length: 500, nullable: true })
imageUrl!: string | null;

@Column({ type: 'varchar', length: 100, nullable: true })
imageAuthorName!: string | null;

@Column({ type: 'varchar', length: 500, nullable: true })
imageAuthorUrl!: string | null;

@Column({ type: 'char', length: 3, nullable: true })
iataCityCode!: string | null;  // IATA Metropolitan Area Code (TYO, OSA 등)
```

마이그레이션 3건:

1. 이미지 컬럼 추가 (`AddCityImageColumns`)
2. 이미지 시드 데이터 (`SeedCityImages`)
3. iataCityCode 컬럼 + 시드 (`AddIataCityCode`)

### 단계 2: Unsplash 이미지 조회 스크립트

`scripts/fetch-city-images.ts` — 로컬에서 1회 실행하여 6개 도시의 대표 이미지 URL + attribution을 조회.

- Unsplash Demo 레벨(시간당 50 req)로 충분 (6 requests)
- 다운로드 추적 + attribution 저장으로 API 정책 준수
- 출력: SQL UPDATE 문 → 단계 3 마이그레이션에 복사

### 단계 3: 이미지 시드 마이그레이션

스크립트 결과를 마이그레이션에 하드코딩. 단계 1의 컬럼 추가와 별도 파일로 분리.

### 단계 4: Cities Controller + Service

**엔드포인트:** `GET /api/v1/cities`

**응답 DTO:**

```typescript
class CityDto {
  id: string;
  nameKo: string;
  nameEn: string;
  nameLocal: string;
  countryCode: string;
  imageUrl: string | null;
  imageAuthorName: string | null;
  imageAuthorUrl: string | null;
  iataCodes: string[];
}
```

location, timezone, currencyCode는 목록 조회에서 제외.

### 단계 5: Travelpayouts Data API v3 서비스

`TravelpayoutsService` — Travelpayouts v3 API 호출.

```typescript
@Injectable()
export class TravelpayoutsService {
  // GET https://api.travelpayouts.com/aviasales/v3/get_latest_prices
  //   ?origin=ICN&currency=KRW&period_type=year&sorting=price
  //   &limit=30&one_way=false&token={TOKEN}
  async getLatestPrices(origin: string): Promise<TravelpayoutsPrice[]> { ... }
}
```

**v3 응답 인터페이스:**

```typescript
interface TravelpayoutsPrice {
  origin: string; // SEL (도시코드로 반환됨)
  destination: string; // TYO, FUK 등 (도시코드)
  price: number;
  gate: string; // 예매 사이트 (v2의 airline 대신)
  departDate: string;
  returnDate: string;
  numberOfChanges: number;
}
```

**주요 변경점 (v2 → v3):**

- 엔드포인트: `/v2/prices/latest` → `/aviasales/v3/get_latest_prices`
- `price` → `value`, `airline` → `gate`, `departure_at` → `depart_date`, `return_at` → `return_date`
- `one_way=false` 명시 필수 (기본값 `true`)
- 응답에 도시코드 반환 (공항코드가 아님) → `iataCityCode` 매칭 필요

**에러 핸들링:** 실패 시 빈 배열 반환. 에러 로그에 URL(토큰 포함) 노출 금지.

### 단계 6: Amadeus Flight Inspiration Search — 스킵

Test 환경 500 에러. Production 전환 전까지 사용 불가.

### 단계 7: 최저가 API 엔드포인트

**엔드포인트:** `GET /api/v1/flights/lowest-prices`

**로직:**

1. Travelpayouts v3 호출 — ICN, GMP 두 번 (Promise.all)
2. DB에서 활성 도시 목록 조회
3. `iataCityCode` + `iataCodes` 양쪽으로 destination 매칭 (도시코드 우선, 공항코드 fallback)
4. 도시당 최저가 추출, 가격순 정렬
5. 데이터 없는 도시는 `lowestPrice: null` (graceful degradation)
6. 인메모리 캐시 3시간 TTL

**응답 DTO:**

```typescript
class CityLowestPriceDto {
  cityId: string;
  cityNameKo: string;
  cityNameEn: string;
  lowestPrice: number | null;
  currency: string; // KRW
  airline: string | null; // 실제로는 gate (예매 사이트명)
  originAirport: string | null;
  departDate: string | null;
  returnDate: string | null;
}

class LowestPricesResponseDto {
  cities: CityLowestPriceDto[];
  origins: string[]; // ['ICN', 'GMP']
  cachedAt: string;
}
```

### 단계 8: 테스트

**단위 테스트 (40 tests 전체 통과):**

- `CitiesService` — findActive, DTO 매핑
- `CitiesController` — findAll 위임
- `TravelpayoutsService` — v3 API 모킹, 응답 변환, 에러 시 빈 배열, 토큰 미설정 시 빈 배열
- `FlightsService.lowestPrices` — 캐시 히트, ICN+GMP 병합, 도시코드 매칭, null 가격, 3시간 TTL
- `FlightsController.lowestPrices` — 위임

### 단계 9: 문서 업데이트

- `.env.example`: `TRAVELPAYOUTS_API_TOKEN`, `UNSPLASH_ACCESS_KEY` 추가
- ADR 6건 추가 (최저가 소스, 캐싱, 복수 출발지, 이미지, iataCityCode, 커버리지 한계)
- task-tracker T21 → ✅

## 수정 대상 파일 목록

| 파일                                                              | 작업                                                                 |
| ----------------------------------------------------------------- | -------------------------------------------------------------------- |
| `apps/backend/src/cities/entities/city.entity.ts`                 | `imageUrl`, `imageAuthorName`, `imageAuthorUrl`, `iataCityCode` 추가 |
| `apps/backend/src/cities/cities.module.ts`                        | Service, Controller 등록                                             |
| `apps/backend/src/cities/cities.controller.ts`                    | **신규** — GET /cities                                               |
| `apps/backend/src/cities/cities.service.ts`                       | **신규** — findActive                                                |
| `apps/backend/src/cities/dto/city.dto.ts`                         | **신규** — 응답 DTO                                                  |
| `apps/backend/src/cities/cities.service.spec.ts`                  | **신규** — 단위 테스트                                               |
| `apps/backend/src/cities/cities.controller.spec.ts`               | **신규** — 단위 테스트                                               |
| `apps/backend/src/flights/travelpayouts.service.ts`               | **신규** — v3 Data API 연동                                          |
| `apps/backend/src/flights/travelpayouts.service.spec.ts`          | **신규** — 단위 테스트                                               |
| `apps/backend/src/flights/interfaces/travelpayouts.interfaces.ts` | **신규** — v3 응답 타입                                              |
| `apps/backend/src/flights/flights.controller.ts`                  | lowest-prices 엔드포인트 추가                                        |
| `apps/backend/src/flights/flights.service.ts`                     | lowestPrices 메서드 추가 (iataCityCode 매칭)                         |
| `apps/backend/src/flights/flights.module.ts`                      | TravelpayoutsService 등록                                            |
| `apps/backend/src/flights/dto/lowest-price.dto.ts`                | **신규** — 응답 DTO                                                  |
| `apps/backend/scripts/fetch-city-images.ts`                       | **신규** — Unsplash 스크립트                                         |
| `.env.example`                                                    | TRAVELPAYOUTS_API_TOKEN, UNSPLASH_ACCESS_KEY                         |
| 마이그레이션 3건                                                  | 이미지 컬럼 + 이미지 시드 + iataCityCode                             |
| 테스트 파일들                                                     | 기존 flights 테스트 수정 + cities/travelpayouts 신규                 |

## 주의사항

- Travelpayouts v3는 v2와 엔드포인트·필드명이 다름. v2는 deprecated (401 Unauthorized)
- Travelpayouts v3 응답은 **도시코드** 반환 (TYO, OSA, FUK 등). `iataCityCode`로 매칭 필수
- `one_way=false` 명시하지 않으면 편도만 반환됨 (기본값 `true`)
- **Travelpayouts 커버리지 한계:** 한국발 일본행은 FUK만 데이터 존재. 러시아 기반 서비스 구조적 한계. 최저가 소스 추가 필요 (Kiwi Tequila 등)
- 교토는 `iataCityCode: null` (자체 공항 없음). 최저가 매칭 대상 아님
- 에러 로그에 요청 URL(API 토큰 포함) 노출 금지
- 인메모리 캐시 3시간 TTL. 서버 재시작 시 캐시 소실
- Airport 엔티티 분리(국제선/국내선 구분)는 국내선 지원 시 검토
