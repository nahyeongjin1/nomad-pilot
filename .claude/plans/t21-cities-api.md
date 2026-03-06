# T21: Cities API (목록 조회 + 이미지 + 최저가)

## Context

T15c(PWA) 완료 후, 프론트엔드 도시 탐색 화면(T22)을 위한 백엔드 API를 구축한다. 도시 목록 조회, 대표 이미지, 날짜 무관 최저가 항공편 가격을 제공한다.

**논의 결과 요약:**

- Cities API와 최저가 API는 별도 엔드포인트로 분리 (캐싱 TTL 상이, 프론트에서 Promise.all)
- 최저가: Travelpayouts `/v2/prices/latest` (primary) + Amadeus Flight Inspiration Search (fallback)
- 최저가 캐싱: 인메모리 3시간 TTL (원본이 48시간 캐시라 짧게 잡아도 의미 없음)
- 출발지: ICN + GMP 복수 출발지 지원 (두 공항 조회 후 도시별 최저가 선택)
- 이미지: Unsplash API 스크립트로 로컬 1회 조회 → 마이그레이션에 URL + attribution 하드코딩
- Unsplash attribution 필수: `imageCredit` 필드 추가 ("Photo by {작가명} on Unsplash")
- 도시 설명/태그: MVP 제외
- 최저가는 DB 저장 안 함 (휘발성 데이터, 인메모리 캐시만)

## 구현 순서

| 단계 | 작업                                         | 주요 파일                                     |
| ---- | -------------------------------------------- | --------------------------------------------- |
| 0    | 브랜치 생성 + task-tracker 🔄                | -                                             |
| 1    | City 엔티티 확장 (`imageUrl`, `imageCredit`) | `city.entity.ts`, 마이그레이션                |
| 2    | Unsplash 이미지 조회 스크립트                | `scripts/fetch-city-images.ts`                |
| 3    | 이미지 URL+credit 시드 마이그레이션          | 마이그레이션 파일                             |
| 4    | Cities Controller + Service                  | `cities.controller.ts`, `cities.service.ts`   |
| 5    | Travelpayouts Data API 서비스                | `travelpayouts.service.ts`                    |
| 6    | Amadeus Flight Inspiration Search 메서드     | `amadeus.service.ts`, `amadeus.interfaces.ts` |
| 7    | 최저가 API 엔드포인트                        | `flights.controller.ts`, `flights.service.ts` |
| 8    | 테스트                                       | `*.spec.ts`                                   |
| 9    | 문서 업데이트 + task-tracker ✅              | CLAUDE.md, ADR, `.env.example`                |

## 단계별 상세

### 단계 0: 초기 설정

- `feat/t21-cities-api` 브랜치 생성
- task-tracker T21 → 🔄

### 단계 1: City 엔티티 확장

City 엔티티에 nullable `imageUrl` + `imageCredit` 컬럼 추가:

```typescript
@Column({ type: 'varchar', length: 500, nullable: true })
imageUrl!: string | null;

@Column({ type: 'varchar', length: 200, nullable: true })
imageCredit!: string | null;  // "Photo by John Doe on Unsplash"
```

마이그레이션 자동 생성으로 `ALTER TABLE cities ADD COLUMN image_url, image_credit` 적용.

### 단계 2: Unsplash 이미지 조회 스크립트

`scripts/fetch-city-images.ts` — 로컬에서 1회 실행하여 6개 도시의 대표 이미지 URL + attribution을 조회하는 도구.

Unsplash API:

- `GET https://api.unsplash.com/search/photos?query=Tokyo+city+skyline&per_page=1&orientation=landscape`
- Authorization: `Client-ID {ACCESS_KEY}`
- 응답에서 추출:
  - `results[0].urls.regular` (1080px 폭) → imageUrl
  - `results[0].user.name` → imageCredit ("Photo by {name} on Unsplash")

**출력 형태:** 콘솔에 도시별 SQL UPDATE 문 생성 → 단계 3 마이그레이션에 복사.

**이 스크립트는 런타임 의존성이 아님.** URL을 찾아주는 도구일 뿐, 결과는 마이그레이션에 하드코딩한다. 환경변수 `UNSPLASH_ACCESS_KEY` 필요 (`.env`에 추가, 런타임에는 불필요).

### 단계 3: 이미지 URL+credit 시드 마이그레이션

스크립트 실행 결과로 얻은 URL과 credit을 마이그레이션에 하드코딩:

```sql
UPDATE cities SET image_url = 'https://images.unsplash.com/photo-xxx?w=800',
                  image_credit = 'Photo by John Doe on Unsplash'
WHERE name_en = 'Tokyo';
-- ... 6개 도시
```

**SQL 이스케이프 규칙:** 작가명·도시명에 작은따옴표가 포함될 수 있으므로(`O'Brien` 등), SQL 문자열 내 `'`는 반드시 `''`로 이스케이프한다. 단계 2 스크립트에서 SQL 생성 시 자동 이스케이프 처리할 것.

**주의:** 시드 데이터의 도시명은 `'Naha'`이며 `'Okinawa'`가 아님. WHERE 절에서 정확한 name_en 사용 필수.

단계 1의 컬럼 추가 마이그레이션과 별도 파일로 분리하여 관심사 분리.

### 단계 4: Cities Controller + Service

**엔드포인트:** `GET /api/v1/cities`

**Service:**

```typescript
@Injectable()
export class CitiesService {
  async findActive(): Promise<City[]> {
    return this.cityRepository.find({
      where: { isActive: true },
      order: { nameKo: 'ASC' },
    });
  }
}
```

**응답 DTO:**

```typescript
class CityDto {
  id: string;
  nameKo: string;
  nameEn: string;
  nameLocal: string;
  countryCode: string;
  imageUrl: string | null;
  imageCredit: string | null;
  iataCodes: string[];
}
```

location(좌표), timezone, currencyCode는 목록 조회에서 제외 (필요 시 단건 조회 추가). 엔티티→DTO 변환은 서비스에서 수동 매핑 (기존 FlightsService.transformOffers 패턴).

Swagger 데코레이터 적용: `@ApiTags('Cities')`, `@ApiOperation`, `@ApiOkResponse` (기존 FlightsController 패턴 일관성).

### 단계 5: Travelpayouts Data API 서비스

`TravelpayoutsService` — Travelpayouts Data API `/v2/prices/latest` 호출.

```typescript
@Injectable()
export class TravelpayoutsService {
  // GET https://api.travelpayouts.com/v2/prices/latest
  //   ?origin=ICN
  //   &currency=KRW
  //   &period_type=year
  //   &sorting=price
  //   &limit=30
  //   &token={TRAVELPAYOUTS_API_TOKEN}
  async getLatestPrices(origin: string): Promise<TravelpayoutsPrice[]> { ... }
}
```

**응답 인터페이스:**

```typescript
interface TravelpayoutsPrice {
  origin: string; // ICN
  destination: string; // NRT
  price: number; // 150000
  airline: string; // KE
  departDate: string; // 2026-04-01
  returnDate: string; // 2026-04-07
  numberOfChanges: number; // 0
  expires: string; // ISO timestamp
}
```

**에러 핸들링:** Travelpayouts 실패 시 빈 배열 반환 (fallback으로 전환). 로그 경고만 출력.

**Rate Limit:** 60 requests/분. 3시간 캐싱 시 하루 최대 8회 호출이므로 넉넉함.

**환경변수:** `TRAVELPAYOUTS_API_TOKEN` (Travelpayouts 대시보드에서 발급, 기존 `TRAVELPAYOUTS_MARKER`와 별도)

### 단계 6: Amadeus Flight Inspiration Search 메서드

기존 `AmadeusService`에 Flight Inspiration Search 메서드 추가. **기존 Flight Offers Search(`/v2/shopping/flight-offers`)와 다른 엔드포인트.**

```typescript
// AmadeusService에 추가
async searchFlightDestinations(origin: string): Promise<AmadeusFlightDestination[]> {
  // GET /v1/shopping/flight-destinations?origin=ICN&oneWay=false
  // 캐시 기반 데이터, 인기 노선 위주
}
```

**`amadeus.interfaces.ts`에 추가:**

```typescript
interface AmadeusFlightDestinationsResponse {
  data: AmadeusFlightDestination[];
}

interface AmadeusFlightDestination {
  type: string;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  price: { total: string };
}
```

**주의:** Amadeus Test 환경(`test.api.amadeus.com`)에서 이 API 지원 여부를 구현 전에 확인해야 함. 미지원 시 fallback 제외하고 Travelpayouts 단독 사용.

### 단계 7: 최저가 API 엔드포인트

**엔드포인트:** `GET /api/v1/flights/lowest-prices`

**Query 파라미터:** 없음 (ICN + GMP 고정 조회)

**로직:**

1. Travelpayouts `/v2/prices/latest` 호출 — ICN, GMP 두 번 호출 (Promise.all)
2. DB에서 활성 도시 목록 조회 (iataCodes 포함)
3. 두 origin의 응답을 합치고, 도시별 IATA 코드로 필터링, 도시당 최저가 추출
4. Travelpayouts에 데이터 없는 도시 → Amadeus Flight Inspiration Search fallback (ICN 기준)
5. 인메모리 캐시 3시간 TTL (`cacheManager.set(key, value, 10_800_000)` — 명시적 TTL 전달, FlightsModule 기본 15분과 별개)

**응답 DTO:**

```typescript
class CityLowestPriceDto {
  cityId: string;
  cityNameKo: string;
  cityNameEn: string;
  lowestPrice: number | null; // null이면 가격 정보 없음
  currency: string; // KRW
  airline: string | null;
  originAirport: string | null; // ICN 또는 GMP (어디서 출발이 더 싼지)
  departDate: string | null; // 최저가 해당 날짜 (참고용)
  returnDate: string | null;
}

class LowestPricesResponseDto {
  cities: CityLowestPriceDto[];
  origins: string[]; // ['ICN', 'GMP']
  cachedAt: string; // 캐시 시점 (프론트에서 "~기준" 표시용)
}
```

**캐싱 전략:**

- 캐시 키: `lowest-prices:ICN,GMP`
- TTL: 3시간 (10,800,000ms)
- `cacheManager.set()` 호출 시 TTL 명시적 전달 (FlightsModule CacheModule 기본 TTL 15분과 별개)
- Travelpayouts 원본이 48시간 캐시이므로 3시간은 충분히 신선

### 단계 8: 테스트

**단위 테스트:**

- `CitiesService` — findActive 테스트
- `TravelpayoutsService` — API 호출 모킹, 응답 파싱, 에러 시 빈 배열 반환
- `AmadeusService.searchFlightDestinations` — Flight Inspiration Search 모킹
- `FlightsService.lowestPrices` — Travelpayouts + fallback 로직, 복수 origin 병합, 캐싱

**E2E 테스트:**

- `GET /api/v1/cities` — 200 응답, 도시 목록 구조 검증
- `GET /api/v1/flights/lowest-prices` — 200 응답, 도시별 최저가 구조 검증

### 단계 9: 문서 업데이트

**`.env.example` 추가:**

```text
TRAVELPAYOUTS_API_TOKEN=your_travelpayouts_api_token
UNSPLASH_ACCESS_KEY=your_unsplash_access_key  # 시드 스크립트용 (런타임 불필요)
```

**ADR 추가:**

- 최저가 소스: Travelpayouts Data API (primary) + Amadeus Flight Inspiration Search (fallback)
- 최저가 캐싱: 인메모리 3시간 (원본 48시간 캐시 대비)
- 복수 출발지: ICN + GMP 동시 조회, 도시별 최저가 선택
- 이미지: Unsplash API 로컬 조회 → 마이그레이션 하드코딩 (attribution 포함)

**task-tracker:** T21 → ✅

## 수정 대상 파일 목록

| 파일                                                              | 작업                                         |
| ----------------------------------------------------------------- | -------------------------------------------- |
| `apps/backend/src/cities/entities/city.entity.ts`                 | `imageUrl`, `imageCredit` 컬럼 추가          |
| `apps/backend/src/cities/cities.module.ts`                        | Service, Controller 등록                     |
| `apps/backend/src/cities/cities.controller.ts`                    | **신규** — GET /cities                       |
| `apps/backend/src/cities/cities.service.ts`                       | **신규** — findActive                        |
| `apps/backend/src/cities/dto/city.dto.ts`                         | **신규** — 응답 DTO                          |
| `apps/backend/src/flights/travelpayouts.service.ts`               | **신규** — Data API 연동                     |
| `apps/backend/src/flights/amadeus.service.ts`                     | searchFlightDestinations 메서드 추가         |
| `apps/backend/src/flights/interfaces/amadeus.interfaces.ts`       | Flight Inspiration Search 응답 타입 추가     |
| `apps/backend/src/flights/interfaces/travelpayouts.interfaces.ts` | **신규** — 응답 타입                         |
| `apps/backend/src/flights/flights.controller.ts`                  | lowest-prices 엔드포인트 추가                |
| `apps/backend/src/flights/flights.service.ts`                     | lowestPrices 메서드 추가                     |
| `apps/backend/src/flights/flights.module.ts`                      | TravelpayoutsService 등록                    |
| `apps/backend/src/flights/dto/lowest-price.dto.ts`                | **신규** — 응답 DTO                          |
| `apps/backend/scripts/fetch-city-images.ts`                       | **신규** — Unsplash 스크립트                 |
| `.env.example`                                                    | TRAVELPAYOUTS_API_TOKEN, UNSPLASH_ACCESS_KEY |
| 마이그레이션 2건                                                  | imageUrl+imageCredit 컬럼 + 이미지 시드      |
| 테스트 파일들                                                     | 단위 + E2E                                   |

## 주의사항

- Travelpayouts Data API 토큰(`TRAVELPAYOUTS_API_TOKEN`)은 기존 마커(`TRAVELPAYOUTS_MARKER`)와 별도. 대시보드에서 API 토큰 확인 필요
- Unsplash 이미지 사용 시 attribution 필수. `imageCredit` 필드에 "Photo by {작가명} on Unsplash" 저장, 프론트에서 표시
- Unsplash 스크립트는 개발 도구일 뿐, `package.json` 의존성에 추가하지 않음 (fetch로 충분)
- Amadeus fallback은 Flight Inspiration Search(`/v1/shopping/flight-destinations`)이며, 기존 Flight Offers Search(`/v2/shopping/flight-offers`)와 다른 엔드포인트. AmadeusService에 별도 메서드 추가 필요
- Amadeus Test 환경에서 Flight Inspiration Search 지원 여부 구현 전 확인. 미지원 시 fallback 제외
- 기존 `cheapestCities` 엔드포인트는 그대로 유지 (날짜 지정 실시간 검색용)
- 다중 공항 도시 (도쿄: NRT+HND, 오사카: KIX+ITM)는 전체 공항 조회 후 최저가 선택
- 교토와 오사카는 KIX를 공유하므로 동일 최저가가 나올 수 있음 (의도된 동작)
- 시드 데이터의 오키나와 도시명은 `'Naha'`이며 `'Okinawa'`가 아님. WHERE 절 주의
- Travelpayouts는 러시아 기반 서비스로, ICN/GMP 출발 데이터가 부족할 수 있음. 이 경우 Amadeus fallback으로 보완
- `cacheManager.set()` 호출 시 TTL을 명시적으로 전달 (FlightsModule 기본 TTL 15분과 혼동 방지)
- 복수 출발지(ICN+GMP) 조회 시 Travelpayouts API 2회 호출. 캐싱 후에는 3시간간 추가 호출 없음
