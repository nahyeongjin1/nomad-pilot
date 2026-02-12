# Nomad-Pilot 프로젝트 허브

> 최저가 일본 자유여행 AI 파일럿 PWA

---

## 프로젝트 개요

- **서빙 형식:** PWA (Mobile-First Web)
- **MVP 시장:** 한국 → 일본 (도쿄, 오사카, 교토, 후쿠오카, 삿포로, 오키나와)
- **핵심 가치:** 가성비, 현장성, 지능
- **기술 스택:** NestJS / PostgreSQL+PostGIS / React PWA / LLM API
- **인프라:** Vercel(Frontend, $0) + Railway Hobby(Backend+DB, $5/월)
- **외부 API:** Amadeus(항공검색) + Kiwi(딥링크) + Agoda/Booking(숙소) + OSM+Google(POI)
- **PRD:** @plans/001-prd.md
- **Feasibility:** @plans/002-feasibility-study.md

---

## 태스크 추적

각 태스크의 상세 계획은 `plans/` 폴더에서 관리.
상태: ⬜ 미착수 | 🔄 진행중 | ✅ 완료

### Foundation

| ID  | 태스크                                | 상태 | 계획서                          |
| --- | ------------------------------------- | ---- | ------------------------------- |
| T01 | 프로젝트 초기 설정 (NestJS + Railway) | ✅   | @plans/003-t01-project-setup.md |
| T02 | DB 스키마 설계 (PostGIS)              | ⬜   | -                               |
| T03 | 공간 쿼리 최적화 전략                 | ⬜   | -                               |

### Search & Data

| ID  | 태스크                           | 상태 | 계획서 |
| --- | -------------------------------- | ---- | ------ |
| T04 | POI 검색 설계 (tsvector + GIN)   | ⬜   | -      |
| T05 | 일본 POI 데이터 파이프라인       | ⬜   | -      |
| T06 | 외부 API 연동 (항공/숙소/딥링크) | ⬜   | -      |

### Core Engine

| ID  | 태스크               | 상태 | 계획서 |
| --- | -------------------- | ---- | ------ |
| T07 | 예산 분배 로직       | ⬜   | -      |
| T08 | 경로 최적화 알고리즘 | ⬜   | -      |
| T09 | 숙소 위치 추천 로직  | ⬜   | -      |
| T10 | 주변 POI 추천 로직   | ⬜   | -      |
| T11 | AI Integration       | ⬜   | -      |

### 여행 중 지원

| ID  | 태스크                 | 상태 | 계획서 |
| --- | ---------------------- | ---- | ------ |
| T12 | 일정 재스케줄링 엔진   | ⬜   | -      |
| T13 | Client Geofencing 설계 | ⬜   | -      |
| T14 | Web Push 알림 설계     | ⬜   | -      |

### Frontend

| ID  | 태스크          | 상태 | 계획서 |
| --- | --------------- | ---- | ------ |
| T15 | PWA 설계        | ⬜   | -      |
| T16 | 지도 UI/UX 설계 | ⬜   | -      |

### Monetization

| ID  | 태스크                    | 상태 | 계획서 |
| --- | ------------------------- | ---- | ------ |
| T17 | 인증/결제 시스템          | ⬜   | -      |
| T18 | Pilot Pass 기능 게이팅    | ⬜   | -      |
| T19 | 딥링크/제휴 수수료 트래킹 | ⬜   | -      |

### Infra & DevOps

| ID  | 태스크                                  | 상태 | 계획서 |
| --- | --------------------------------------- | ---- | ------ |
| T20 | 배포 아키텍처 (Vercel + Railway, CI/CD) | ⬜   | -      |

---

## 의사결정 로그 (ADR)

| 날짜       | 결정                        | 근거                                                                               |
| ---------- | --------------------------- | ---------------------------------------------------------------------------------- |
| 2026-02-12 | 서빙 형식: PWA              | 진입장벽 최소화, 오프라인 지원, 해외 즉시 접근                                     |
| 2026-02-12 | 문서 관리: .claude/ 내부    | 코드와 문서 분리, 태스크별 plans/ 관리, CLAUDE.md 허브 방식                        |
| 2026-02-12 | 방향: 최저가 여행 파일럿    | 가치 제안 명확화, 타겟 확장, 수익화 경로 다양화                                    |
| 2026-02-12 | MVP 1인 여행 고정           | 그룹 복잡도 회피, DB 확장 가능 설계, 그룹은 Phase 3 유료                           |
| 2026-02-12 | WebSocket 전면 제거         | REST + Web Push + Client Geofencing 대체. 해외 데이터 절약                         |
| 2026-02-12 | 동행자 위치: 1회 조회 방식  | 실시간 불필요, REST 조회로 충분                                                    |
| 2026-02-12 | 인프라: Vercel + Railway    | Frontend $0 + Backend/DB $5/월. NestJS 학습 목적 유지                              |
| 2026-02-12 | MVP DB 단일화: PostgreSQL만 | ES/Redis 스케일링 시 도입. tsvector+GIN 텍스트 검색, PostGIS 공간 검색             |
| 2026-02-12 | MVP 일본 한정               | 한국인 해외여행 1위, OSM 품질 우수, 스코프 축소. @plans/002-feasibility-study.md   |
| 2026-02-12 | 항공: Amadeus + Kiwi        | Amadeus(검색) + Kiwi(딥링크 3%). @plans/002-feasibility-study.md §1                |
| 2026-02-12 | POI: OSM + Google Places    | OSM(기본, 무료) + Google(on-demand). @plans/002-feasibility-study.md §3            |
| 2026-02-12 | 개발 방식: TDD              | 테스트 먼저 작성 → 구현 → 리팩터. 모든 서비스/로직에 테스트 필수                   |
| 2026-02-12 | Git: GitHub Flow            | main + feat/fix 브랜치. 태스크 단위 브랜치 → main 머지. develop 불필요 (1인 MVP)   |
| 2026-02-12 | 로깅: Pino (nestjs-pino)    | JSON 네이티브, 요청별 자동 로깅. dev: pino-pretty, prod: JSON. Railway stdout 수집 |

---

## 컨벤션

- **문서 언어:** 한영 혼용 (설계 문서는 한국어, 코드/커밋은 영어)
- **문서 코드 비율:** 개념 중심 설명, 코드 스니펫 최소화
- **계획서 파일명:** `plans/{번호}-{주제}.md` (예: `002-db-schema.md`)
- **브랜치 전략:** GitHub Flow (`main` + `feat|fix/*` 브랜치)
- **브랜치 네이밍:** `feat/t{번호}-{설명}` 또는 `fix/{설명}` (예: `feat/t02-db-schema`)
- **커밋 컨벤션:** Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`)

---

## 개발 워크플로우

### 로컬 개발 환경

```bash
# 1. DB 기동
docker compose up -d

# 2. 마이그레이션 (빌드 후 실행)
pnpm build && pnpm migration:run

# 3. 개발 서버
pnpm start:dev    # http://localhost:3000/api/v1
                  # Swagger: http://localhost:3000/docs
```

### TDD 사이클

모든 기능은 **Red → Green → Refactor** 순서로 개발.

```bash
pnpm test              # 단위 테스트 (Jest)
pnpm test:watch        # 워치 모드
pnpm test:e2e          # E2E 테스트
pnpm test:cov          # 커버리지
```

- **서비스 로직:** 단위 테스트 (mock 의존성)
- **컨트롤러:** E2E 테스트 (supertest, 실제 HTTP 요청)
- **DB 쿼리:** 통합 테스트 (Docker PostGIS 연결)

### 마이그레이션 워크플로우

```bash
# 엔티티 코드 작성/변경 후
pnpm build
pnpm migration:generate --name=DescriptiveName  # 자동 생성 (엔티티↔DB 비교)
pnpm migration:run                               # 적용

# PostGIS 확장 등 엔티티 무관 작업
pnpm migration:create --name=ManualMigration     # 빈 파일 생성 → 수동 작성
```
