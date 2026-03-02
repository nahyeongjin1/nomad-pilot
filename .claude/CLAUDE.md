# Nomad-Pilot 프로젝트 허브

> 최저가 일본 자유여행 AI 파일럿 PWA

---

## 프로젝트 개요

- **서빙 형식:** PWA (Mobile-First Web)
- **MVP 시장:** 한국 → 일본 (도쿄, 오사카, 교토, 후쿠오카, 삿포로, 오키나와)
- **핵심 가치:** 가성비, 현장성, 지능
- **기술 스택:** NestJS / PostgreSQL+PostGIS / React PWA / LLM API
- **레포 구조:** pnpm workspace 모노레포 (`apps/backend`, `apps/frontend`, `packages/shared`)
- **인프라:** Vercel(Frontend, $0) + Railway Hobby(Backend+DB, $5/월)
- **외부 API:** Amadeus(항공검색) + Kiwi(딥링크) + Agoda/Booking(숙소) + OSM+Google(POI)
- **PRD:** `.claude/docs/prd.md` (skill: `/prd`)
- **Feasibility:** `.claude/docs/feasibility-study.md` (skill: `/feasibility`)

---

## 태스크 추적

@docs/task-tracker.md

---

## 의사결정 로그 (ADR)

@docs/adr.md

---

## 컨벤션

- **문서 언어:** 한영 혼용 (설계 문서는 한국어, 코드/커밋은 영어)
- **문서 코드 비율:** 개념 중심 설명, 코드 스니펫 최소화
- **문서 구조:** `.claude/docs/` (프로젝트 레벨 문서), `.claude/plans/` (태스크 계획서)
- **계획서 파일명:** `.claude/plans/t{번호}-{주제}.md` (예: `t02-db-schema.md`)
- **브랜치 전략:** GitHub Flow (`main` + `feat|fix/*` 브랜치)
- **브랜치 네이밍:** `feat/t{번호}-{설명}` 또는 `fix/{설명}` (예: `feat/t02-db-schema`)
- **커밋 컨벤션:** Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`)
- **PR 작성:** skill `/create-pr`로 생성 (`.github/PULL_REQUEST_TEMPLATE.md` 기반)
- **포맷팅:** Prettier (.prettierrc) + ESLint 기준. VSCode format-on-save + pre-commit hook이 자동 처리하므로, Prettier/ESLint 스타일 경고는 무시하며 진행. (TS 컴파일 에러나 테스트 실패는 반드시 수정)

---

## 개발 워크플로우

### 로컬 개발 환경

```bash
# 1. DB 기동
docker compose up -d

# 2. 마이그레이션 (premigration 훅이 자동 빌드)
pnpm migration:run

# 3. 개발 서버
pnpm start:dev    # http://localhost:3000/api/v1
                  # Swagger: http://localhost:3000/docs
```

### TDD 사이클

모든 기능은 **Red → Green → Refactor** 순서로 개발.

```bash
pnpm test              # 전체 단위 테스트 (Jest)
pnpm test:watch        # 워치 모드
pnpm test:e2e          # E2E 테스트
pnpm test:cov          # 커버리지

# 특정 테스트 파일만 실행 (pnpm -- 전달 문제로 npx jest 직접 사용)
cd apps/backend && npx jest --testPathPatterns='파일명' --no-coverage
# 예: npx jest --testPathPatterns='deeplink.service' --no-coverage
```

- **서비스 로직:** 단위 테스트 (mock 의존성)
- **컨트롤러:** E2E 테스트 (supertest, 실제 HTTP 요청)
- **DB 쿼리:** 통합 테스트 (Docker PostGIS 연결)

### 마이그레이션 워크플로우

```bash
# 엔티티 코드 작성/변경 후 (premigration 훅이 자동 빌드하므로 pnpm build 불필요)
npm_config_name=DescriptiveName pnpm -F backend migration:generate  # 자동 생성 (엔티티↔DB 비교)
pnpm -F backend migration:run                                       # 적용

# PostGIS 확장 등 엔티티 무관 작업
npm_config_name=ManualMigration pnpm -F backend migration:create    # 빈 파일 생성 → 수동 작성
```
