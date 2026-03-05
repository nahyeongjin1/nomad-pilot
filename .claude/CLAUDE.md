# Nomad-Pilot 프로젝트 허브

> 최저가 일본 자유여행 AI 파일럿 PWA

---

## 프로젝트 개요

- **서빙 형식:** PWA (Mobile-First Web)
- **MVP 시장:** 한국 → 일본 (도쿄, 오사카, 교토, 후쿠오카, 삿포로, 오키나와)
- **핵심 가치:** 가성비, 현장성, 지능
- **기술 스택:** NestJS / PostgreSQL+PostGIS / Vite+React+TanStack(Router,Query) PWA / LLM API
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

상세 조회: `.claude/docs/adr.md` (skill: `/adr`)

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

```bash
# 전체 (백엔드 + 프론트엔드 동시 기동)
pnpm dev              # concurrently: be(3000) + fe(5173)

# 개별
pnpm dev:be           # 백엔드만
pnpm dev:fe           # 프론트엔드만

# 빌드 / 테스트 / 린트
pnpm build            # 백엔드 + 프론트엔드 순차 빌드
pnpm test             # 백엔드 + 프론트엔드 순차 테스트
pnpm lint             # ESLint (백엔드 + 프론트엔드)
```

백엔드/프론트엔드별 상세 명령어는 각 `apps/*/CLAUDE.md` 참조.
