# T04: POI 텍스트 검색 설계 (pg_trgm) 실행 계획

## Context

T02에서 POI 엔티티에 `search_vector` tsvector 컬럼 + GIN 인덱스를 미리 생성했으나, 사전 논의에서 **pg_trgm (트라이그램)이 CJK 언어에 더 적합**하다는 결론을 내렸다:

- PostgreSQL에 한국어/일본어 기본 텍스트 검색 사전 없음
- tsvector + `simple` 사전은 일본어(띄어쓰기 없음) 토큰화 불가
- pg_trgm은 언어 무관 → 동남아/유럽 확장에도 동일 전략 유지
- `pg_trgm` 1.6이 `postgis/postgis:17-3.5` 이미지에 포함 확인 (로컬 검증은 완료)

사전 합의:

- **tsvector 컬럼**: 삭제 (마이그레이션). 미사용 컬럼 + 인덱스 제거
- **pg_trgm 인덱스**: GIN (`gin_trgm_ops`) 선택. 벤치마크에서 S1/S2/S4 모두 GiST 대비 2~3배 우수
- **인덱스 대상**: `name`, `name_local` 각각 개별 인덱스 (expression index보다 유연)
- **검색 쿼리**: `ILIKE` 매칭 + `similarity()` 랭킹. 벤치마크 후 조정
- **tags**: 검색 대상 아님 (프론트에서 드롭다운/필터)
- **최소 검색어 길이**: 프론트엔드 UX로 처리
- **범위**: 쿼리 패턴 설계 + 벤치마크 (T03 스타일). Service/Controller는 기능 태스크에서

---

## 벤치마크 대상 쿼리

| ID  | 패턴              | 사용 시점       | SQL 핵심                               |
| --- | ----------------- | --------------- | -------------------------------------- |
| S1  | 키워드 검색       | F5. 장소 선택   | `ILIKE '%keyword%'` on name/name_local |
| S2  | 키워드 + 카테고리 | F4~F5. POI 탐색 | S1 + `category` 필터                   |
| S3  | 키워드 + 반경     | F10. 재스케줄링 | S1 + `ST_DWithin`                      |
| S4  | 유사도 검색       | F5. 오타 허용   | `similarity()` / `%` 연산자            |

---

## 성능 목표

| 쿼리                  | 데이터 규모      | 목표   |
| --------------------- | ---------------- | ------ |
| S1. 키워드 검색       | 도시당 ~10,000건 | < 20ms |
| S2. 키워드 + 카테고리 | 동일             | < 20ms |
| S3. 키워드 + 반경     | 동일             | < 30ms |
| S4. 유사도 검색       | 동일             | < 50ms |

- **측정**: `EXPLAIN ANALYZE` (warm cache)
- **환경**: 로컬 Docker PostGIS 17-3.5, WSL2

---

## 쿼리 패턴 SQL

### S1: 키워드 검색

```sql
SELECT id, name, name_local, category, rating,
       GREATEST(
         similarity(name, :keyword),
         similarity(COALESCE(name_local, ''), :keyword)
       ) AS score
FROM pois
WHERE city_id = :cityId
  AND is_active = true
  AND (name ILIKE '%' || :keyword || '%' OR name_local ILIKE '%' || :keyword || '%')
ORDER BY score DESC
LIMIT :limit;
```

### S2: 키워드 + 카테고리

S1에 `AND category = :category` 추가.

### S3: 키워드 + 반경

S1에 `AND ST_DWithin(location, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radius_m)` 추가. 거리순 정렬.

### S4: 유사도 검색 (오타 허용)

```sql
SELECT id, name, name_local, category, rating,
       GREATEST(
         similarity(name, :keyword),
         similarity(COALESCE(name_local, ''), :keyword)
       ) AS score
FROM pois
WHERE city_id = :cityId
  AND is_active = true
  AND (name % :keyword OR name_local % :keyword)
ORDER BY score DESC
LIMIT :limit;
```

`%` 연산자는 `pg_trgm.similarity_threshold` (기본 0.3) 이상인 행만 반환.

---

## 인덱스 변경

### 삭제

| 인덱스                   | 타입           | 비고               |
| ------------------------ | -------------- | ------------------ |
| `IDX_pois_search_vector` | GIN (tsvector) | tsvector 전략 폐기 |

### 신규 (확정: GIN)

| 컬럼         | 타입               | SQL                                                                                                                  |
| ------------ | ------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `name`       | GIN (gin_trgm_ops) | `CREATE INDEX IDX_pois_name_trgm_gin ON pois USING GIN (name gin_trgm_ops)`                                          |
| `name_local` | GIN (gin_trgm_ops) | `CREATE INDEX IDX_pois_name_local_trgm_gin ON pois USING GIN (name_local gin_trgm_ops) WHERE name_local IS NOT NULL` |

### 기존 유지

location (GiST), city_id (B-tree), category (B-tree) — T03에서 검증 완료.

---

## 엔티티 변경

### `apps/backend/src/pois/entities/poi.entity.ts`

삭제:

```typescript
@Index('IDX_pois_search_vector', { synchronize: false })
@Column({ type: 'tsvector', nullable: true, select: false })
searchVector!: string | null;
```

pg_trgm 인덱스는 기존 `name`/`name_local` 컬럼에 직접 적용되므로 엔티티 변경 불필요. 마이그레이션에서 인덱스만 관리.

---

## 실행 순서

### Step 0: 문서 정리

- 계획서를 `.claude/plans/006-t04-poi-search.md`로 저장
- CLAUDE.md에 T04 계획서 링크 추가, T04 🔄 진행중

### Step 1: 마이그레이션 + 엔티티

- `Poi` 엔티티에서 `searchVector` 필드 제거
- 자동 마이그레이션 (`migration:generate`): `search_vector` 컬럼 + `IDX_pois_search_vector` 삭제
- 수동 마이그레이션 (`migration:create`): pg_trgm 확장 + GIN **및** GiST trgm 인덱스 모두 생성 (벤치마크용)
- `pnpm migration:run`

### Step 2: 벤치마크 데이터

- T03 시드 스크립트로 OSM 데이터 재적재
- 건수 확인

### Step 3: 쿼리 벤치마크 (GIN vs GiST 비교)

- S1~S4 각각 **GIN 인덱스만 활성화** / **GiST 인덱스만 활성화** 상태에서 EXPLAIN ANALYZE
- S4는 추가로 GiST KNN 쿼리 (`ORDER BY name <-> :keyword`) 벤치마크
- 검색어: 한국어("라멘"), 영어("ramen"), 일본어("ラーメン")
- `pg_trgm.similarity_threshold` 튜닝
- 인덱스 사용 여부 확인

### Step 4: 결과 분석 + 판정

- GIN vs GiST 성능 비교표 작성
- 성능 목표 달성 여부
- **인덱스 타입 최종 선택** (GIN 또는 GiST)
- ILIKE vs similarity 패턴 확정
- similarity_threshold 권고값

### Step 5: 정리

- 벤치마크 데이터 삭제
- CLAUDE.md: T04 ✅ + ADR
- 태스크 트래커 업데이트

---

## 산출물

모두 이 계획서에 기록:

1. 쿼리 패턴 SQL 확정본
2. EXPLAIN ANALYZE 결과 + 실행 시간
3. 성능 목표 달성 여부 판정
4. similarity_threshold 권고값
5. 추가 인덱스 필요 여부

---

## 벤치마크 결과

> 2026-02-28 실행. 환경: Docker PostGIS 17-3.5, WSL2

### 데이터 규모

| 도시     | POI 건수    |
| -------- | ----------- |
| Tokyo    | 59,659      |
| Osaka    | 33,986      |
| Kyoto    | 9,355       |
| Sapporo  | 6,375       |
| Fukuoka  | 5,598       |
| Naha     | 2,645       |
| **합계** | **117,618** |

### GIN vs GiST 비교 (도쿄 59,659건, warm cache)

| 쿼리                  | GIN        | GiST       | 목표   | 승자        |
| --------------------- | ---------- | ---------- | ------ | ----------- |
| S1 "ramen" ILIKE      | **4.7ms**  | 15.7ms     | < 20ms | GIN (3.3x)  |
| S1 "ラーメン" ILIKE   | **6.8ms**  | 13.6ms     | < 20ms | GIN (2x)    |
| S2 ramen + restaurant | **11.6ms** | 15.0ms     | < 20ms | GIN (1.3x)  |
| S3 cafe + 1km 반경    | 70.1ms     | **25.2ms** | < 30ms | GiST (2.8x) |
| S4 "rmen" 유사도 `%`  | **7.4ms**  | 22.3ms     | < 50ms | GIN (3x)    |
| S4 KNN `<->`          | N/A        | 35.0ms     | -      | GiST only   |

### 실행 계획 분석

- **S1/S2/S4 (GIN)**: BitmapAnd → trgm GIN + city_id B-tree 조합. 메모리 정렬은 후보 수백 건이라 무시 가능
- **S3**: ST_DWithin + ILIKE 조합 시 Planning Time이 31ms로 병목. 인덱스 타입과 무관한 문제
- **KNN (GiST)**: city_id 필터 후 후보가 적어 이론적 장점 발현 안 됨. `%` + 메모리 정렬(GIN 7.4ms)이 더 빠름

### 판정

| 항목                 | 결과                   | 비고                                               |
| -------------------- | ---------------------- | -------------------------------------------------- |
| **인덱스 타입**      | **GIN 선택**           | S1/S2/S4 모두 2~3배 우수. KNN은 실측에서 장점 없음 |
| S1 성능 목표         | **Pass**               | 4.7~6.8ms (목표 < 20ms)                            |
| S2 성능 목표         | **Pass**               | 11.6ms (목표 < 20ms)                               |
| S3 성능 목표         | **Fail (별도 최적화)** | 70ms. ST_DWithin + ILIKE 조합의 Planning Time 문제 |
| S4 성능 목표         | **Pass**               | 7.4ms (목표 < 50ms)                                |
| similarity_threshold | **기본값 0.3 유지**    | 오타("rmen") 검색 시 적절한 후보 반환 확인         |

### 권고 사항

- S3(키워드 + 반경): 서비스 레이어에서 반경 검색과 텍스트 검색을 분리 쿼리로 실행 후 조합 권장
- similarity_threshold 조정은 프로덕션 검색 품질 피드백에 따라 튜닝

---

## 파일 구조

```text
apps/backend/
  src/
    pois/entities/poi.entity.ts             # searchVector 필드 삭제
    database/migrations/
      {timestamp}-DropSearchVector.ts       # search_vector 컬럼/인덱스 삭제 (자동)
      {timestamp}-EnablePgTrgm.ts           # pg_trgm 확장 + GIN trgm 인덱스 (수동)
  scripts/
    seed-benchmark-pois.ts                  # T03 시드 스크립트 재활용
.claude/plans/
  006-t04-poi-search.md                     # 이 계획서
```

---

## 검증 방법

```bash
# 1. Docker DB 기동
docker compose up -d

# 2. 마이그레이션 적용
pnpm migration:run

# 3. pg_trgm 확인
psql -c "SELECT show_trgm('東京タワー');"

# 4. 인덱스 확인
psql -c "\di+ *trgm*"

# 5. 벤치마크 데이터 적재
cd apps/backend && npx ts-node scripts/seed-benchmark-pois.ts

# 6. 검색 벤치마크
psql -c "EXPLAIN ANALYZE SELECT ... FROM pois WHERE name ILIKE '%ramen%' AND city_id = '...';"
```
