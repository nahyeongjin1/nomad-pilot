# T05: 일본 POI 데이터 파이프라인 실행 계획

## Context

T03에서 벤치마크용으로 Overpass API → DB 적재 스크립트(`seed-benchmark-pois.ts`)를 만들었다. T05에서는 이를 기반으로 **프로덕션용 OSM 데이터 파이프라인**을 구축하고, **Google Places on-demand 보강 전략**을 설계한다.

사전 논의에서 합의된 사항:

- **데이터 전략**: OSM (기본, 저장 가능) + Google Places (on-demand, 저장 불가)
- **Foursquare 탈락**: Premium 데이터 무료 티어 없음 ($18.75/1K), Google과 동일한 캐싱 제한, Phase 2/3 지역 확장 시 마이그레이션 리스크
- **배치 보강 불가**: Google/Foursquare 모두 ToS에서 서버 사이드 POI 상세 데이터 저장 금지
- **증분 업데이트**: 파이프라인이 주기적 갱신을 지원해야 함 (1회성이 아닌)
- **벤치마크 스크립트**: 프로덕션 파이프라인과 별도 유지 (테스트용)

---

## 범위

| 포함                                    | 제외                                     |
| --------------------------------------- | ---------------------------------------- |
| OSM 프로덕션 파이프라인 스크립트        | PoisService/Controller (기능 태스크에서) |
| 증분 업데이트 (UPSERT)                  | Google Places 전체 구현 (설계만)         |
| OSM 데이터 품질 개선 (opening_hours 등) | 프론트엔드 POI 상세 뷰                   |
| POI 엔티티 변경 (google_place_id 추가)  | 스케줄링/크론 자동화 (MVP 이후)          |
| Google Places 보강 아키텍처 설계        | Google Places API 키 발급/설정           |
| NestJS 모듈 최소 세팅 (ConfigModule 등) | 검색 API (T04에서 설계 완료)             |

---

## 아키텍처

### 데이터 레이어 구분

```text
Layer 1: OSM (기본 데이터)
  ├─ 저장 가능 (ODbL 라이선스, 출처 표기 필수)
  ├─ 필드: 이름, 위치, 카테고리, 주소, 영업시간, 태그
  ├─ 갱신: Overpass API로 주기적 sync
  └─ DB 저장: pois 테이블에 직접 저장

Layer 2: Google Places (on-demand 보강)
  ├─ 저장 불가 (ToS: 실시간 호출 필수)
  ├─ 필드: 평점, 사진, 리뷰, 영업시간(상세), 가격대
  ├─ 호출 시점: 사용자가 POI 상세 조회 시
  └─ 캐싱: place_id만 DB 저장 가능 (반복 호출 비용 절감)
```

### 호출 흐름 (Maps JS API Places Library + fire & forget)

Google은 클라이언트/서버 용도로 **별개의 API**를 제공한다:

| API                                      | 의도된 환경 | 키 노출                     | 용도                        |
| ---------------------------------------- | ----------- | --------------------------- | --------------------------- |
| **Maps JavaScript API (Places Library)** | 브라우저    | 공개 (Google이 의도한 패턴) | UI: 상세 조회, Autocomplete |
| **Places API (New) REST**                | 서버        | 비공개 필수                 | 배치 처리, 경로 최적화      |

클라이언트에서는 **Maps JS API Places Library**를 사용한다. Places API REST 엔드포인트를 브라우저에서 직접 호출하는 것은 Google이 의도하지 않은 패턴이므로 사용하지 않는다.

```text
[POI 리스트 뷰]
  └─ 백엔드 API → DB에서 OSM 데이터 반환 (이름, 카테고리, 위치, google_place_id)

[POI 상세 뷰] — 사용자 클릭 시 (Maps JS API Places Library)
  ├─ google_place_id가 이미 있음?
  │    └─ Yes → Places Library getDetails() (place_id로 직접 조회)
  │
  ├─ google_place_id가 없음?
  │    └─ Places Library findPlaceFromQuery() (이름+좌표로 검색)
  │         ├─ 응답에서 place_id 추출 → 즉시 getDetails() 호출
  │         └─ fire & forget: PATCH /api/v1/pois/:id { googlePlaceId }
  │              (백엔드에 비동기 저장, 실패해도 무시)
  │
  └─ Google 응답을 클라이언트에서 바로 렌더링
```

#### 왜 클라이언트 직접 호출인가

| 항목             | 서버 경유 (Places API REST)       | 클라이언트 (Maps JS API Places Library)   |
| ---------------- | --------------------------------- | ----------------------------------------- |
| RTT (일본 유저)  | ~160ms (유저→SG→Google→SG→유저)   | ~20-30ms (유저→Google 도쿄 Edge)          |
| API 키 보호      | 서버에 숨김                       | 브라우저 노출 (다층 보안 적용)            |
| 비용 제어        | 서버에서 rate limit               | Google Console quota + 일일 캡            |
| place_id 저장    | 서버에서 직접                     | fire & forget PATCH                       |
| Google 공식 지원 | 서버용 API를 서버에서 호출 (정상) | 브라우저용 API를 브라우저에서 호출 (정상) |

- Railway 리전: **싱가포르** (일본→SG ~50-70ms). 가깝지만 클라이언트 직접이 여전히 우위
- `place_id`는 POI별 공유 데이터: 한 유저가 매칭하면 이후 **모든 유저가 Find Place 단계 생략** (커뮤니티 캐시 효과)

#### API 키 보안 (다층 방어)

Maps JS API의 API 키는 브라우저에 노출되므로 다층 보안을 적용한다:

| 계층 | 보호 수단          | 설명                                              | 시점    |
| ---- | ------------------ | ------------------------------------------------- | ------- |
| 1    | HTTP Referrer 제한 | `https://nomad-pilot.vercel.app/*`만 허용         | MVP     |
| 2    | API 제한           | Maps JavaScript API만 허용 (다른 Google API 차단) | MVP     |
| 3    | 일일 할당량 캡     | Places 1,000 req/day (초과 시 API 중단)           | MVP     |
| 4    | 예산 알림          | 50%, 90%, 100% 임계값 알림                        | MVP     |
| 5    | Firebase App Check | reCAPTCHA로 앱 인스턴스 검증, 스크립트 공격 차단  | 런칭 전 |

- **브라우저 전용 키와 서버 전용 키를 반드시 분리** (향후 서버에서 Places API REST 사용 시)
- **키 로테이션**: 90일 주기 권장
- Referrer 제한만으로는 curl/스크립트로 우회 가능 → **Firebase App Check가 핵심 방어선**

#### fire & forget 패턴

- **실패 허용**: place_id 저장 실패 → 다음 유저가 Find Place 재호출 ($0.017). 치명적이지 않음
- **UI 블로킹 없음**: Google 응답 즉시 렌더링, 저장은 백그라운드
- **구현**: `navigator.sendBeacon()` 또는 `fetch(..., { keepalive: true })`
- **자연 캐시 워밍**: 인기 POI는 다수 유저 조회로 place_id가 빠르게 채워짐

---

## OSM 프로덕션 파이프라인 vs 벤치마크 스크립트

| 항목          | 벤치마크 (`seed-benchmark-pois.ts`) | 프로덕션 (`sync-osm-pois.ts`)            |
| ------------- | ----------------------------------- | ---------------------------------------- |
| 목적          | 쿼리 벤치마크용 일회성 적재         | 프로덕션 데이터 관리                     |
| 충돌 처리     | `ON CONFLICT DO NOTHING`            | `ON CONFLICT DO UPDATE` (UPSERT)         |
| 태그          | `['benchmark-seed']`                | OSM 원본 태그 보존                       |
| 추출 필드     | 기본 (이름, 위치, 카테고리)         | 확장 (영업시간, 웹사이트, wikidata 등)   |
| 비활성화 감지 | 없음                                | OSM에서 삭제된 POI → `is_active = false` |
| 동기화 추적   | 없음                                | `last_synced_at` 컬럼으로 추적           |
| 삭제          | `clean` 명령으로 전체 삭제          | 비활성화만 (하드 삭제 안 함)             |

---

## 엔티티 변경

### `Poi` 엔티티 추가 필드

| 필드          | 타입          | 제약            | 용도                                               |
| ------------- | ------------- | --------------- | -------------------------------------------------- |
| googlePlaceId | varchar(255)  | nullable, index | Google Places API 반복 호출 비용 절감              |
| lastSyncedAt  | timestamptz   | nullable        | OSM 동기화 시점 추적 (증분 업데이트/비활성화 감지) |
| website       | varchar(1000) | nullable        | OSM `website` 태그                                 |
| phone         | varchar(50)   | nullable        | OSM `phone` 태그                                   |

`openingHours` (jsonb, 기존 필드)에 OSM `opening_hours` 문자열을 구조화하여 저장.

### openingHours JSON 스키마

OSM의 `opening_hours` 태그는 복잡한 형식 (예: `Mo-Fr 09:00-17:00; Sa 10:00-14:00`). MVP에서는 원본 문자열을 보존하고 간단한 구조만 파싱:

```json
{
  "raw": "Mo-Fr 09:00-17:00; Sa 10:00-14:00",
  "parsed": false
}
```

고급 파싱은 프론트엔드 또는 향후 태스크에서 `opening_hours` npm 패키지로 처리. DB에는 `raw` 문자열만 확실히 저장.

---

## OSM 데이터 추출 개선

### 추가 추출 대상 OSM 태그

| OSM 태그        | POI 필드     | 용도                                 |
| --------------- | ------------ | ------------------------------------ |
| `opening_hours` | openingHours | 영업시간 (jsonb에 raw 저장)          |
| `website`       | website      | 공식 웹사이트                        |
| `phone`         | phone        | 전화번호                             |
| `wikidata`      | tags         | 인기도 프록시 (위키데이터 항목 유무) |
| `wikipedia`     | tags         | 인기도 프록시                        |
| `addr:full`     | address      | 주소 (기존)                          |
| `addr:postcode` | tags         | 우편번호                             |
| `cuisine`       | subCategory  | 음식 종류 (기존)                     |
| `name:ko`       | name         | 한국어 이름 우선 (기존 name:en 대신) |

### 이름 선택 로직

벤치마크 스크립트: `name:en` > `name` > `name:ja`
프로덕션 파이프라인: 아래 헬퍼 함수로 로케일별 우선순위 관리.

```typescript
// 로케일별 이름 우선순위 설정
const NAME_PRIORITY: Record<string, string[]> = {
  ko: ['name:ko', 'name:en', 'name', 'name:ja'], // 한국어 사용자 (MVP)
  en: ['name:en', 'name', 'name:ja'], // 향후 영어권 확장
};

const NAME_LOCAL_PRIORITY: Record<string, string[]> = {
  ko: ['name:ja', 'name'], // 현지어 = 일본어 우선
  en: ['name:ja', 'name'],
};

function selectName(
  tags: Record<string, string>,
  locale: string,
): string | null {
  const priority = NAME_PRIORITY[locale] ?? NAME_PRIORITY['en'];
  for (const key of priority) {
    if (tags[key]) return tags[key];
  }
  return null;
}

function selectNameLocal(
  tags: Record<string, string>,
  locale: string,
): string | null {
  const priority = NAME_LOCAL_PRIORITY[locale] ?? NAME_LOCAL_PRIORITY['en'];
  for (const key of priority) {
    if (tags[key]) return tags[key];
  }
  return null;
}
```

MVP에서는 `locale = 'ko'` 고정. 향후 지역 확장(동남아, 유럽) 시 로케일 설정만 추가하면 이름 선택 로직 변경 없이 대응 가능.

### 인기도 태깅

wikidata/wikipedia 태그가 있는 POI는 관광지/랜드마크일 확률이 높음. `tags` 배열에 `has_wikidata` 추가하여 향후 정렬/필터링에 활용.

---

## UPSERT 전략

### 증분 업데이트 SQL

```sql
INSERT INTO pois (city_id, name, name_local, location, category, sub_category,
                  source_id, tags, source, locale, is_active, address,
                  opening_hours, website, phone, last_synced_at)
VALUES (...)
ON CONFLICT (source, source_id) WHERE source_id IS NOT NULL
DO UPDATE SET
  name = EXCLUDED.name,
  name_local = EXCLUDED.name_local,
  location = EXCLUDED.location,
  category = EXCLUDED.category,
  sub_category = EXCLUDED.sub_category,
  address = EXCLUDED.address,
  opening_hours = EXCLUDED.opening_hours,
  website = EXCLUDED.website,
  phone = EXCLUDED.phone,
  tags = EXCLUDED.tags,
  is_active = true,
  last_synced_at = EXCLUDED.last_synced_at,
  updated_at = NOW();
```

`name_local`, `source`, `city_id`는 변경하지 않음 (소스 안정성). `is_active = true`로 재활성화 (이전에 비활성화된 POI가 OSM에 복귀한 경우).

### 비활성화 감지

동기화 실행 후, 해당 도시의 OSM POI 중 `last_synced_at`이 현재 실행 시각보다 이전인 항목을 비활성화:

```sql
UPDATE pois
SET is_active = false, updated_at = NOW()
WHERE city_id = :cityId
  AND source = 'osm'
  -- NULL last_synced_at은 자동 제외 (의도적): 수동 추가 POI나 마이그레이션 이전 데이터 보호
  AND last_synced_at < :syncStartedAt
  AND is_active = true;
```

---

## Google Places 보강 설계

### API 호출 전략

| 단계         | API                  | 비용       | 캐싱 가능 여부       |
| ------------ | -------------------- | ---------- | -------------------- |
| 1. POI 매칭  | Find Place From Text | $17/1K     | place_id만 저장 가능 |
| 2. 상세 조회 | Place Details        | $17~$25/1K | 응답 저장 불가       |

**비용 최적화**: `google_place_id`를 DB에 저장하면 단계 1을 생략할 수 있어 호출 비용 절반 절감.

### 필드 마스크 (비용 절감)

Place Details 호출 시 필요 필드만 요청:

```text
fields=rating,user_ratings_total,price_level,opening_hours,photos,reviews
```

Basic 필드($0): name, formatted_address, geometry → 이미 OSM에서 확보
Contact 필드($17/1K): formatted_phone_number, opening_hours, website
Atmosphere 필드($25/1K): price_level, rating, reviews, user_ratings_total

MVP에서는 **Atmosphere 필드만 요청** (평점, 가격대가 핵심 가치).

### 응답 처리

Google Places 응답은 DB에 저장하지 않음. **클라이언트에서 직접 호출하고 직접 렌더링**.

클라이언트가 사용할 타입 참고 (T15/T16에서 `packages/shared`에 정의):

```typescript
// 참고용 타입 스케치. 실제 정의는 T15/T16에서 Google Places API 응답 스펙에 맞춰 확정
interface GooglePlacesEnrichment {
  rating: number | null;
  userRatingsTotal: number | null;
  priceLevel: number | null;
  openingHours: {
    weekdayText: string[];
    isOpenNow: boolean;
  } | null;
  photos: { url: string; attribution: string }[];
}
```

### place_id 저장 API

클라이언트의 fire & forget 요청을 받는 백엔드 엔드포인트:

```text
PATCH /api/v1/pois/:id
Body: { "googlePlaceId": "ChIJ..." }
```

- `:id`는 POI의 내부 UUID (`pois.id`). 리스트 뷰 API 응답에 포함되어 클라이언트가 이미 보유
- 이미 값이 있으면 무시 (최초 매칭만 저장)
- 응답: 204 No Content

#### 보안/무결성 요구사항

| 항목          | 정책                        | 근거                                                             |
| ------------- | --------------------------- | ---------------------------------------------------------------- |
| 인증          | **불필요**                  | POI 소유권 개념 없음. 커뮤니티 캐시 특성상 누구나 기여 가능      |
| 포맷 검증     | non-empty + 최대 길이 체크  | Place ID는 불투명 문자열 (ChIJ/GhIJ 등 다양한 접두사). 파싱 금지 |
| 멱등성        | 최초 1회만 저장             | `googlePlaceId`가 이미 있으면 업데이트 무시. 덮어쓰기 불가       |
| POI 존재 확인 | `:id`가 유효한 POI UUID인지 | 존재하지 않는 POI에 대한 요청은 404                              |
| Rate Limit    | **불필요**                  | 멱등성 + 유한한 POI 수로 남용 상한이 구조적으로 제한됨           |
| CORS          | 앱 레벨 설정으로 충분       | NestJS 글로벌 CORS가 허용 origin만 통과시킴                      |

### 구현 범위 (T05)

T05에서는 **설계와 기반 구현**:

1. POI 엔티티에 `googlePlaceId` 컬럼 추가 (+ 마이그레이션)
2. `.env.example`에 `GOOGLE_PLACES_API_KEY` 추가
3. `PATCH /api/v1/pois/:id` 엔드포인트 구현 (place_id 저장용, 간단한 단일 필드 업데이트)

**T15/T16에서 구현할 항목** (Google Places 관련):

- `GooglePlacesEnrichment` 공유 타입 정의 (`packages/shared`)
- Maps JS API Places Library 연동 구현
- place_id fire & forget 클라이언트 로직 (`navigator.sendBeacon` / `fetch keepalive`)
- API 키 보안: Referrer 제한 + API 제한 + 일일 캡 + Firebase App Check

---

## 실행 순서

### Step 0: 문서 정리

- 계획서를 `.claude/plans/t05-poi-pipeline.md`로 저장
- CLAUDE.md에 T05 계획서 링크 추가, T05 🔄 진행중

### Step 1: 엔티티 변경 + 마이그레이션

- `Poi` 엔티티에 `googlePlaceId`, `lastSyncedAt`, `website`, `phone` 추가
- 자동 마이그레이션 생성 → 적용

### Step 2: 프로덕션 OSM 파이프라인 스크립트

- `apps/backend/scripts/sync-osm-pois.ts` 생성
- 벤치마크 스크립트 패턴 재활용 (Overpass 호출, 배치 INSERT)
- UPSERT 로직 + 비활성화 감지
- 추가 OSM 태그 추출
- 이름 우선순위 변경 (`name:ko` 최우선)
- CLI: `sync` (전체/도시별), `status` (현황 조회)

### Step 3: 통합 테스트

- 스크립트 실행 → 데이터 적재 확인
- 2차 실행 → UPSERT 동작 확인 (기존 레코드 업데이트)
- 비활성화 감지 확인

### Step 4: Google Places 기반 세팅

- `.env.example`에 `GOOGLE_PLACES_API_KEY` 추가
- 향후 구현을 위한 인터페이스/타입 정의

### Step 5: 정리

- 벤치마크 데이터 정리 (프로덕션 데이터로 교체)
- CLAUDE.md: T05 ✅ + ADR
- 태스크 트래커 업데이트

---

## 파일 구조

```text
apps/backend/
  src/
    pois/
      entities/poi.entity.ts             # googlePlaceId, lastSyncedAt, website, phone 추가
      interfaces/
        google-places.interface.ts       # Google Places 응답 타입 정의
      pois.module.ts
    database/migrations/
      {timestamp}-AddPoiPipelineFields.ts  # 새 컬럼 추가 (자동)
  scripts/
    sync-osm-pois.ts                     # 프로덕션 OSM 파이프라인 (신규)
    seed-benchmark-pois.ts               # 벤치마크용 (기존 유지)
.claude/plans/
  t05-poi-pipeline.md                    # 이 계획서
```

---

## 검증 방법

```bash
# 1. Docker DB 기동
docker compose up -d

# 2. 마이그레이션 적용
pnpm -F backend migration:run

# 3. 프로덕션 파이프라인 실행 (전체)
cd apps/backend && npx ts-node scripts/sync-osm-pois.ts

# 4. 현황 확인
cd apps/backend && npx ts-node scripts/sync-osm-pois.ts status

# 5. 증분 업데이트 확인 (2차 실행)
cd apps/backend && npx ts-node scripts/sync-osm-pois.ts

# 6. 특정 도시만 동기화
cd apps/backend && npx ts-node scripts/sync-osm-pois.ts sync Tokyo
```
