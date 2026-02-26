# T03: 공간 쿼리 최적화 전략 실행 계획

## Context

T02에서 POI/City 엔티티에 `geography(Point, 4326)` 컬럼과 GiST 인덱스를 생성했다. T03에서는 이 공간 스키마가 **실제 데이터에서 성능 목표를 달성하는지 검증**하고, 서비스에서 사용할 **쿼리 패턴을 확정**한다.

사전 논의에서 합의된 사항:

- **범위**: 쿼리 패턴 설계 + EXPLAIN ANALYZE 벤치마크. Repository/Service 구현은 각 기능 태스크에서
- **데이터**: Overpass API로 실제 OSM 데이터 추출 (벤치마크용 일회성, T05 파이프라인과 별개)
- **좌표 타입**: geography 유지. 벤치마크 미달 시 geometry 전환 검토
- **인덱스**: 현재 단일 GiST로 벤치마크. 부족 시 복합 인덱스 추가 판단
- **클러스터링**: DB 레벨 부적합 (비즈니스 제약 반영 불가). 앱 레벨 + 워커 스레드로 처리 (T08 범위)

---

## 벤치마크 대상 쿼리

서비스 쿼리를 **응답 유형별**로 분류:

### 동기 쿼리 (사용자가 즉시 응답을 기다림)

| ID  | 패턴          | 사용 시점        | SQL 핵심                                |
| --- | ------------- | ---------------- | --------------------------------------- |
| Q1  | 반경 검색     | F4. POI 탐색     | `ST_DWithin(location, :point, :radius)` |
| Q2  | 반경 + 필터   | F4~F5. 장소 선택 | Q1 + `category`, `rating` 필터          |
| Q6  | 주변 POI 추천 | F10. 재스케줄링  | Q2 + `ORDER BY ST_Distance` + `LIMIT`   |

### 비동기 쿼리 (BullMQ 등으로 백그라운드 처리 가능)

| ID  | 패턴                 | 사용 시점          | SQL 핵심             |
| --- | -------------------- | ------------------ | -------------------- |
| Q3  | POI 간 거리 매트릭스 | F6. 루트 생성 입력 | `ST_Distance` N개 쌍 |

- Q4(클러스터링), Q5(숙소 위치)는 앱 레벨 로직 → T08, T09 범위
- Q3은 클러스터링/루트 생성의 입력 데이터

---

## 성능 목표

| 쿼리              | 데이터 규모      | 목표 (DB 쿼리 시간) |
| ----------------- | ---------------- | ------------------- |
| Q1. 반경 검색     | 도시당 ~10,000건 | < 20ms              |
| Q2. 반경 + 필터   | 동일             | < 20ms              |
| Q3. 거리 매트릭스 | POI 쌍 ~20개     | < 50ms              |
| Q6. 주변 POI 추천 | 도시당 ~10,000건 | < 20ms              |

- **측정 방법**: `EXPLAIN ANALYZE` (DB 쿼리 실행 시간)
- **측정 환경**: 로컬 Docker PostGIS
- **동시성**: T03에서는 고려하지 않음. 서비스 레이어 구현 시 재검토

---

## 테스트 데이터

### 데이터 소스: Overpass API

6개 도시(도쿄, 오사카, 교토, 후쿠오카, 삿포로, 나하)의 실제 OSM POI를 추출한다.

- **대상 카테고리**: 음식점, 카페, 관광지, 쇼핑, 사찰/신사, 공원, 박물관
- **예상 규모**: 도시당 수천~만 건
- **용도**: 벤치마크 전용 일회성 (프로덕션 파이프라인은 T05)

### Overpass API 쿼리 예시

```text
[out:json][timeout:60];
area["name:en"="Osaka"]->.city;
(
  node["amenity"~"restaurant|cafe"](area.city);
  node["tourism"~"attraction|museum"](area.city);
  node["shop"](area.city);
);
out body;
```

### 데이터 적재

- Overpass 응답 → JSON 파싱 → POI 엔티티 매핑 → DB INSERT
- 임시 시드 스크립트 (`scripts/seed-benchmark-pois.ts`)
- 벤치마크 완료 후 데이터 삭제 가능

---

## 쿼리 패턴 SQL

### Q1: 반경 검색

```sql
SELECT id, name, name_local, category, rating,
       ST_Distance(location, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography) AS distance_m
FROM pois
WHERE ST_DWithin(location, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radius_m)
  AND city_id = :cityId
  AND is_active = true
ORDER BY distance_m
LIMIT :limit;
```

### Q2: 반경 + 필터

```sql
SELECT id, name, name_local, category, rating, price_level,
       ST_Distance(location, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography) AS distance_m
FROM pois
WHERE ST_DWithin(location, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radius_m)
  AND city_id = :cityId
  AND category = :category
  AND rating >= :minRating
  AND is_active = true
ORDER BY distance_m
LIMIT :limit;
```

### Q3: POI 간 거리 매트릭스

```sql
SELECT a.id AS from_id, b.id AS to_id,
       ST_Distance(a.location, b.location) AS distance_m
FROM pois a
CROSS JOIN pois b
WHERE a.id IN (:ids) AND b.id IN (:ids) AND a.id < b.id;
```

### Q6: 주변 POI 추천

Q2와 동일 구조. 현재 위치 기준 반경 + 필터 + 거리순 정렬.

---

## 현재 인덱스 현황

| 테이블 | 컬럼     | 타입   | 비고           |
| ------ | -------- | ------ | -------------- |
| pois   | location | GiST   | 반경 검색 핵심 |
| pois   | city_id  | B-tree | 도시 필터      |
| pois   | category | B-tree | 카테고리 필터  |
| cities | location | GiST   | 도시 공간 쿼리 |

벤치마크 후 복합 인덱스 필요 여부를 판단한다. 현재 데이터 규모(도시당 ~10,000건)에서는 단일 인덱스로 충분할 것으로 예상.

---

## 실행 순서

### Step 0: 문서 정리

- 이 계획서를 `.claude/plans/005-t03-spatial-query.md`로 저장
- CLAUDE.md에 T03 계획서 링크 추가
- T03 상태를 🔄 진행중으로 변경

### Step 1: 벤치마크 데이터 준비

- Overpass API로 6개 도시 POI 추출 스크립트 작성 (`scripts/seed-benchmark-pois.ts`)
- OSM 카테고리 → PoiCategory enum 매핑
- DB에 적재 후 건수 확인

### Step 2: 쿼리 벤치마크

- Q1, Q2, Q3, Q6 각각 EXPLAIN ANALYZE 실행
- 다양한 조건으로 반복 (반경 500m/1km/2km, 카테고리별, 도시별)
- 실행 계획 분석 (GiST Scan 사용 여부, 필터링 비용)

### Step 3: 결과 분석 및 판정

- 성능 목표 달성 여부 판정
- geography 유지/전환 판정
- 추가 인덱스 필요 여부 권고
- 벤치마크 결과를 계획서에 기록

### Step 4: 정리

- 벤치마크 데이터 삭제 (`scripts/seed-benchmark-pois.ts clean`)
- CLAUDE.md: T03 ✅ + ADR (해당 시)
- 태스크 트래커 업데이트

---

## 산출물

모두 **이 계획서에 직접 기록**한다. 별도 문서 생성 없음.

1. 쿼리 패턴 SQL 확정본 (위 쿼리 패턴 섹션을 벤치마크 후 업데이트)
2. EXPLAIN ANALYZE 결과 + 실행 시간 (아래 벤치마크 결과 섹션에 기록)
3. 성능 목표 달성 여부 판정
4. geography 유지/전환 판정
5. 추가 인덱스 필요 여부 및 권고

의사결정 사항은 CLAUDE.md ADR에 반영.

---

## 벤치마크 결과 (실행 후 기록)

> Step 2~3 완료 후 이 섹션을 채운다.

### 데이터 규모

| 도시           | POI 건수 |
| -------------- | -------- |
| (실행 후 기록) |          |

### Q1: 반경 검색

```text
(EXPLAIN ANALYZE 결과 붙여넣기)
```

### Q2: 반경 + 필터

```text
(EXPLAIN ANALYZE 결과 붙여넣기)
```

### Q3: 거리 매트릭스

```text
(EXPLAIN ANALYZE 결과 붙여넣기)
```

### Q6: 주변 POI 추천

```text
(EXPLAIN ANALYZE 결과 붙여넣기)
```

### 판정

| 항목           | 결과                | 비고 |
| -------------- | ------------------- | ---- |
| 성능 목표 달성 | (Pass/Fail)         |      |
| geography 유지 | (유지/전환)         |      |
| 추가 인덱스    | (불필요/필요: 상세) |      |

---

## 파일 구조

```text
apps/backend/scripts/
  seed-benchmark-pois.ts          # Overpass API → DB 적재 스크립트
.claude/plans/
  005-t03-spatial-query.md        # 이 계획서
```

- Repository/Service 코드는 생성하지 않음 (각 기능 태스크에서 구현)
- 벤치마크 결과는 계획서에 직접 기록

---

## 검증 방법

```bash
# 1. Docker DB 기동
docker compose up -d

# 2. 마이그레이션 적용
pnpm migration:run

# 3. 벤치마크 데이터 적재
cd apps/backend && npx ts-node scripts/seed-benchmark-pois.ts

# 4. 데이터 건수 확인
psql -c "SELECT city_id, COUNT(*) FROM pois GROUP BY city_id;"

# 5. 쿼리 벤치마크 (예: 오사카역 반경 1km 음식점)
psql -c "EXPLAIN ANALYZE SELECT ... FROM pois WHERE ST_DWithin(...);"
```
