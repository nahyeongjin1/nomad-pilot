# T20: 배포 아키텍처 (Backend CI/CD + Railway)

## Context

T06a(항공 API) 완료 후 다음 단계. 현재 상태:

- Dockerfile, railway.toml 존재하지만 CI 파이프라인 없음
- 마이그레이션 자동 실행 없음 (배포 시 수동 필요)
- Railway 대시보드 미설정

**목표**: main 머지 시 자동으로 lint/test → Docker 빌드 → 마이그레이션 → 앱 시작이 이뤄지는 파이프라인 구축.

## 아키텍처

```text
PR → GitHub Actions CI (lint + build + test)
      ↓ pass
main merge → Railway auto-deploy (Watch Paths: apps/backend/**)
              ↓
            Docker build (Dockerfile)
              ↓
            preDeployCommand: migration:run
              ↓
            node main.js
```

- **Railway "Wait for CI"**: GitHub Actions 성공 후에만 배포 트리거
- **Railway "Watch Paths"**: `apps/backend/**` 변경 시에만 배포 (프론트 변경 무시)
- **Railway "preDeployCommand"**: 마이그레이션을 앱 시작 전에 실행 (실패 시 배포 중단)

## 구현 순서

| 단계 | 작업                                                     | 파일                          |
| ---- | -------------------------------------------------------- | ----------------------------- |
| 0    | 계획서 이동 + 브랜치 생성 + task-tracker 업데이트        | `.claude/plans/t20-deploy.md` |
| 1    | GitHub Actions CI 워크플로우                             | `.github/workflows/ci.yml`    |
| 2    | railway.toml 업데이트 (preDeployCommand + watchPatterns) | `railway.toml`                |
| 3    | Dockerfile 정리 (CMD 유지)                               | `apps/backend/Dockerfile`     |
| 4    | Railway 대시보드 수동 설정                               | -                             |
| 5    | 문서 업데이트 + task-tracker ✅                          | `.claude/docs/*`              |

### 단계 0: 초기 설정

- 이 계획서를 `.claude/plans/t20-deploy.md`로 복사
- `feat/t20-deploy` 브랜치 생성
- `.claude/docs/task-tracker.md`에서 T20 상태를 🔄로 변경

### 단계 1: GitHub Actions CI

`.github/workflows/ci.yml`:

- **트리거**: PR (main 대상) + push (main)
- **path filter**: `apps/backend/**` 변경 시에만 실행
- **단계**: pnpm install → lint → build → test
- **Node 22** + pnpm (corepack)

```yaml
name: CI
on:
  pull_request:
    branches: [main]
    paths: ['apps/backend/**', 'packages/shared/**', 'pnpm-lock.yaml']
  push:
    branches: [main]
    paths: ['apps/backend/**', 'packages/shared/**', 'pnpm-lock.yaml']

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @nomad-pilot/backend lint
      - run: pnpm --filter @nomad-pilot/backend build
      - run: pnpm --filter @nomad-pilot/backend test
```

### 단계 2: railway.toml 업데이트

Railway 공식 config-as-code 기반. `preDeployCommand`로 마이그레이션 자동 실행 (entrypoint.sh 불필요).

```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "apps/backend/Dockerfile"
watchPatterns = ["apps/backend/**", "packages/shared/**", "pnpm-lock.yaml"]

[deploy]
preDeployCommand = "node ./node_modules/typeorm/cli.js migration:run -d apps/backend/dist/database/data-source.js"
healthcheckPath = "/api/v1"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

- `preDeployCommand`: 새 컨테이너 시작 전 마이그레이션 실행. 실패 시 배포 자체가 중단됨
- `watchPatterns`: 모노레포에서 백엔드 관련 변경만 배포 트리거
- `healthcheckTimeout = 300`: 충분한 시간 확보 (5분)

### 단계 3: Dockerfile 정리

`preDeployCommand`로 마이그레이션을 처리하므로 Dockerfile은 기존 `CMD` 유지. 변경 없음.

### 단계 4: Railway 대시보드 수동 설정

구현 단계가 아닌 가이드. README나 별도 문서로 정리.

1. **PostgreSQL 추가**: PostGIS 템플릿 (Railway marketplace)
2. **환경 변수 설정**:
   - `DATABASE_URL` → PostgreSQL 서비스 참조 변수 (`${{Postgres.DATABASE_URL}}`)
   - `NODE_ENV=production`
   - `PORT=3000`
   - `AMADEUS_CLIENT_ID`, `AMADEUS_CLIENT_SECRET`, `AMADEUS_BASE_URL`
   - `TRAVELPAYOUTS_MARKER`
3. **Settings**:
   - Watch Paths: `apps/backend/**` (railway.toml과 동일)
   - Wait for CI: 활성화 (GitHub Actions 연동)

### 단계 5: 문서 업데이트

- `.claude/docs/task-tracker.md`: T20 상태를 ✅로 변경
- `.claude/docs/adr.md`: 배포 관련 ADR 추가 (Railway auto-deploy + Wait for CI, 마이그레이션 자동 실행)
- `.claude/docs/feasibility-study.md`: 예측과 달라진 부분이 있으면 반영 (Railway 설정, 비용 등)

## 비용

- Railway Hobby: $5/월 (Backend + PostgreSQL)
- GitHub Actions: 무료 (public repo) 또는 2,000분/월 (private repo free tier)

## 검증 방법

1. PR 생성 → GitHub Actions 실행 → lint/build/test 통과 확인
2. main 머지 → Railway 배포 자동 트리거 확인
3. `/api/v1` 헬스체크 응답 확인
4. Swagger UI (`/docs`) 접근 확인

## 주요 파일 참조

- `apps/backend/Dockerfile` - 기존 멀티스테이지 빌드
- `railway.toml` - 기존 Railway 설정
- `apps/backend/src/database/data-source.ts` - DATABASE_URL 지원, SSL 설정
- `apps/backend/package.json` - typeorm CLI 스크립트 참조
