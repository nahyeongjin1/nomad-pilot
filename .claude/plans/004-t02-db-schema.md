# T02: DB 스키마 설계 (PostGIS) 실행 계획

## Context

T01에서 NestJS + TypeORM + PostGIS 기반이 완성됨. 이제 MVP에 필요한 도메인 엔티티를 설계하고 마이그레이션을 생성한다. 사전 논의에서 합의된 사항:

- **Users**: MVP부터 생성, Trip에 FK 연결
- **익명 공유**: Trip에 nullable `share_token` (나중에 추가 가능)
- **POI 이름**: `name` + `name_local` + `locale` (확장성 확보)
- **예산**: 정규화 `budget_allocations` 테이블 (다통화/다국가 여행 지원)

---

## 엔티티 관계도

```text
users (soft delete)
  │
  ├──< trips (hard delete)
  │      ├── city ─── cities
  │      ├──< budget_allocations
  │      └──< trip_days
  │             └──< trip_day_pois >── pois ─── cities
```

7개 테이블: `users`, `cities`, `pois`, `trips`, `budget_allocations`, `trip_days`, `trip_day_pois`

---

## 네이밍 전략

TypeORM 기본 동작은 프로퍼티명을 그대로 컬럼명으로 사용 (`nameKo` → `nameKo`). PostgreSQL snake_case 컨벤션을 위해 커스텀 SnakeNamingStrategy 구현.

- `apps/backend/src/common/naming/snake-naming.strategy.ts`에 직접 구현 (~30줄)
- 외부 패키지(`typeorm-naming-strategies`) 대신 자체 구현 — 의존성 최소화
- `database.module.ts`와 `data-source.ts` 양쪽에 적용

---

## 엔티티 설계

### 공통: BaseEntity (추상 클래스)

| 필드      | 타입 | 비고              |
| --------- | ---- | ----------------- |
| id        | UUID | PK, auto-generate |
| createdAt | Date | CreateDateColumn  |
| updatedAt | Date | UpdateDateColumn  |

### Enum 정의 (`common/enums/`)

- **TripStatus**: planning, confirmed, in_progress, completed, cancelled
- **BudgetCategory**: flight, accommodation, food, activity, transport, shopping, other
- **PoiCategory**: restaurant, cafe, attraction, shopping, temple_shrine, park, museum, entertainment, nightlife, transport_hub, other
- **PoiSource**: osm, google, manual

### 1. User

| 필드         | 타입         | 제약                        |
| ------------ | ------------ | --------------------------- |
| email        | varchar(255) | unique, not null            |
| passwordHash | varchar(255) | nullable (소셜 로그인 대비) |
| nickname     | varchar(100) | not null                    |
| deletedAt    | timestamp    | soft delete                 |
| trips        | OneToMany    | → Trip                      |

### 2. City (참조 데이터)

| 필드         | 타입                  | 제약                      |
| ------------ | --------------------- | ------------------------- |
| nameKo       | varchar(100)          | not null (도쿄)           |
| nameEn       | varchar(100)          | not null (Tokyo)          |
| nameLocal    | varchar(100)          | not null (東京)           |
| countryCode  | char(2)               | not null, index (JP)      |
| location     | geography(Point,4326) | spatial index             |
| timezone     | varchar(50)           | not null                  |
| iataCodes    | text[]                | not null, 배열 (NRT, HND) |
| currencyCode | char(3)               | not null (JPY)            |
| isActive     | boolean               | default true              |

City는 curated 참조 데이터 → `nameKo`/`nameEn`/`nameLocal` 3컬럼.
`iataCodes` 배열로 다중 공항 지원 (도쿄: NRT+HND). 별도 airports 테이블 불필요.

### 3. Poi

| 필드             | 타입                  | 제약                           |
| ---------------- | --------------------- | ------------------------------ |
| city             | ManyToOne             | → City, RESTRICT               |
| cityId           | uuid                  | index                          |
| name             | varchar(255)          | not null (표시용)              |
| nameLocal        | varchar(255)          | nullable (현지어)              |
| locale           | varchar(10)           | nullable (ja)                  |
| location         | geography(Point,4326) | spatial index (GiST)           |
| category         | enum PoiCategory      | not null, index                |
| subCategory      | varchar(100)          | nullable                       |
| description      | text                  | nullable                       |
| descriptionLocal | text                  | nullable                       |
| address          | varchar(500)          | nullable                       |
| addressLocal     | varchar(500)          | nullable                       |
| rating           | decimal(3,2)          | nullable (0.00~5.00)           |
| priceLevel       | smallint              | nullable (1~4)                 |
| openingHours     | jsonb                 | nullable                       |
| imageUrl         | varchar(1000)         | nullable                       |
| source           | enum PoiSource        | not null, index                |
| sourceId         | varchar(255)          | nullable                       |
| tags             | text[]                | default '{}'                   |
| isActive         | boolean               | default true                   |
| searchVector     | tsvector              | nullable, GIN index (T04 대비) |

- Partial unique: `(source, source_id) WHERE source_id IS NOT NULL`
- `searchVector`: T04에서 트리거 구현 예정, 스키마만 미리 준비

### 4. Trip

| 필드           | 타입            | 제약                    |
| -------------- | --------------- | ----------------------- |
| user           | ManyToOne       | → User, CASCADE         |
| userId         | uuid            | index                   |
| city           | ManyToOne       | → City, RESTRICT        |
| cityId         | uuid            | index                   |
| title          | varchar(255)    | not null                |
| status         | enum TripStatus | default PLANNING, index |
| totalBudgetKrw | integer         | not null                |
| travelMonth    | smallint        | not null (1~12)         |
| travelYear     | smallint        | not null                |
| durationDays   | smallint        | not null                |
| startDate      | date            | nullable                |
| endDate        | date            | nullable                |
| shareToken     | varchar(21)     | nullable, unique        |

### 5. BudgetAllocation

| 필드         | 타입                | 제약                       |
| ------------ | ------------------- | -------------------------- |
| trip         | ManyToOne           | → Trip, CASCADE            |
| tripId       | uuid                |                            |
| category     | enum BudgetCategory | not null                   |
| amount       | decimal(12,2)       | not null                   |
| currency     | char(3)             | not null (ISO 4217)        |
| exchangeRate | decimal(10,4)       | nullable (KRW 항목은 null) |
| isEstimated  | boolean             | default true               |

- Unique composite: `(tripId, category)`
- `exchangeRate`: 환산 시점의 환율 스냅샷 (예: JPY→KRW = 9.2). amount × exchangeRate = KRW 환산액. KRW 항목은 환전 불필요하므로 null.

### 6. TripDay

| 필드      | 타입      | 제약            |
| --------- | --------- | --------------- |
| trip      | ManyToOne | → Trip, CASCADE |
| tripId    | uuid      |                 |
| dayNumber | smallint  | not null        |
| date      | date      | nullable        |
| memo      | text      | nullable        |

- Unique composite: `(tripId, dayNumber)`

### 7. TripDayPoi

| 필드               | 타입          | 제약               |
| ------------------ | ------------- | ------------------ |
| tripDay            | ManyToOne     | → TripDay, CASCADE |
| tripDayId          | uuid          |                    |
| poi                | ManyToOne     | → Poi, RESTRICT    |
| poiId              | uuid          |                    |
| visitOrder         | smallint      | not null           |
| plannedArrival     | time          | nullable           |
| plannedDeparture   | time          | nullable           |
| estimatedCostLocal | decimal(10,2) | nullable           |
| notes              | text          | nullable           |

- Unique composite: `(tripDayId, visitOrder)`

---

## 삭제 규칙

| 부모 → 자식                     | onDelete | 이유                                              |
| ------------------------------- | -------- | ------------------------------------------------- |
| User → Trip                     | CASCADE  | User는 soft delete 사용, 하드 삭제 시 여행도 삭제 |
| City → Trip/Poi                 | RESTRICT | 참조 중인 도시 삭제 방지                          |
| Trip → BudgetAllocation/TripDay | CASCADE  | 여행 삭제 시 하위 데이터도 삭제                   |
| TripDay → TripDayPoi            | CASCADE  | 일자 삭제 시 방문 기록도 삭제                     |
| Poi → TripDayPoi                | RESTRICT | 일정에 연결된 POI 삭제 방지                       |

---

## 인덱스 전략

| 테이블             | 컬럼                       | 타입             | 용도                 |
| ------------------ | -------------------------- | ---------------- | -------------------- |
| pois               | location                   | GiST             | 반경 내 POI 검색     |
| pois               | search_vector              | GIN              | 텍스트 검색 (T04)    |
| pois               | city_id                    | B-tree           | 도시별 필터          |
| pois               | category                   | B-tree           | 카테고리 필터        |
| pois               | (source, source_id)        | partial unique   | 중복 임포트 방지     |
| cities             | location                   | GiST             | 공간 쿼리            |
| trips              | user_id                    | B-tree           | 내 여행 목록         |
| trips              | status                     | B-tree           | 상태 필터            |
| budget_allocations | (trip_id, category)        | unique composite | Trip당 카테고리 유일 |
| trip_days          | (trip_id, day_number)      | unique composite | Trip당 일자 유일     |
| trip_day_pois      | (trip_day_id, visit_order) | unique composite | 일자당 순서 유일     |

---

## 파일 구조

```text
apps/backend/src/
  common/
    entities/base.entity.ts
    enums/
      trip-status.enum.ts
      budget-category.enum.ts
      poi-category.enum.ts
      poi-source.enum.ts
      index.ts
    naming/snake-naming.strategy.ts
  users/
    entities/user.entity.ts
    users.module.ts
  cities/
    entities/city.entity.ts
    cities.module.ts
  pois/
    entities/poi.entity.ts
    pois.module.ts
  trips/
    entities/
      trip.entity.ts
      budget-allocation.entity.ts
      trip-day.entity.ts
      trip-day-poi.entity.ts
    trips.module.ts
```

---

## 마이그레이션 전략

1. 모든 엔티티 코드 작성 완료
2. `pnpm build`
3. `pnpm migration:generate --name=CreateSchema` — 단일 자동 생성
4. 생성된 마이그레이션 검토 (GIN index on searchVector 누락 시 수동 추가)
5. `pnpm migration:create --name=SeedJapaneseCities` — 수동 시드 데이터

### 시드: 일본 6개 도시

| nameEn  | nameKo   | nameLocal | IATA     | 좌표              |
| ------- | -------- | --------- | -------- | ----------------- |
| Tokyo   | 도쿄     | 東京      | NRT, HND | 35.6762, 139.6503 |
| Osaka   | 오사카   | 大阪      | KIX, ITM | 34.6937, 135.5023 |
| Kyoto   | 교토     | 京都      | KIX      | 35.0116, 135.7681 |
| Fukuoka | 후쿠오카 | 福岡      | FUK      | 33.5904, 130.4017 |
| Sapporo | 삿포로   | 札幌      | CTS      | 43.0618, 141.3545 |
| Naha    | 나하     | 那覇      | OKA      | 26.2124, 127.6809 |

---

## 실행 순서

### Step 0: 문서 정리 (가장 먼저)

- 이 계획서를 `.claude/plans/004-t02-db-schema.md`로 저장
- CLAUDE.md에 T02 계획서 링크 추가 (`@plans/004-t02-db-schema.md`)
- T02 상태를 🔄 진행중으로 변경

### Step 1: 기반 코드

- 커스텀 SnakeNamingStrategy 구현
- `database.module.ts`, `data-source.ts`에 네이밍 전략 적용
- BaseEntity, Enum 파일 생성

### Step 2: 엔티티 + 모듈

- 7개 엔티티 파일 생성
- 4개 도메인 모듈 (Users, Cities, Pois, Trips) 생성
- `app.module.ts`에 등록

### Step 3: 마이그레이션

- 빌드 → 자동 생성 → 검토 → 시드 수동 작성 → 실행

### Step 4: 검증

- Docker PostGIS 기동 → 마이그레이션 실행
- 테이블/인덱스 존재 확인, 시드 데이터 확인
- 서버 기동 → `GET /api/v1` 200 응답

### Step 5: 테스트

- 엔티티 통합 테스트 (CRUD, 공간 쿼리, 제약 조건 위반)

### Step 6: 문서 최신화

- CLAUDE.md: T02 ✅ + ADR (예산 정규화, POI 네이밍, SnakeNamingStrategy, 환율 스냅샷, Trip 삭제 정책)

---
