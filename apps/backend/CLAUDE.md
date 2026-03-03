# Backend (apps/backend)

> NestJS 11 + TypeORM + PostGIS REST API

## 기술 스택

- **프레임워크:** NestJS 11 (Express)
- **ORM:** TypeORM 0.3 + PostGIS (geography 타입)
- **DB:** PostgreSQL 17 + PostGIS 3.5
- **로깅:** nestjs-pino (dev: pretty, prod: JSON)
- **검증:** class-validator + class-transformer (global ValidationPipe)
- **캐싱:** cache-manager (인메모리, Redis는 스케일 시 도입)
- **API 문서:** Swagger (http://localhost:3000/docs, non-prod only)
- **테스트:** Jest + supertest
- **배포:** Railway Hobby ($5/월)

## 개발 명령어

```bash
# DB 기동
docker compose up -d

# 마이그레이션
pnpm -F backend migration:run

# 개발 서버 (http://localhost:3000/api/v1, Swagger: /docs)
pnpm dev:be

# 테스트
pnpm test:be                    # 전체 단위 테스트
pnpm test:e2e                   # E2E 테스트
pnpm --filter @nomad-pilot/backend test:watch   # 워치 모드
pnpm --filter @nomad-pilot/backend test:cov     # 커버리지

# 특정 테스트 파일만 실행
cd apps/backend && npx jest --testPathPatterns='파일명' --no-coverage
```

## TDD 사이클

모든 기능은 **Red → Green → Refactor** 순서로 개발.

- **서비스 로직:** 단위 테스트 (mock 의존성)
- **컨트롤러:** E2E 테스트 (supertest, 실제 HTTP 요청)
- **DB 쿼리:** 통합 테스트 (Docker PostGIS 연결)

## 마이그레이션 워크플로우

```bash
# 엔티티 코드 작성/변경 후 (premigration 훅이 자동 빌드하므로 pnpm build 불필요)
npm_config_name=DescriptiveName pnpm -F backend migration:generate
pnpm -F backend migration:run

# PostGIS 확장 등 엔티티 무관 작업
npm_config_name=ManualMigration pnpm -F backend migration:create
```

## 컨벤션

- **Global prefix:** `/api/v1`
- **네이밍:** SnakeNamingStrategy (TypeORM camelCase → PostgreSQL snake_case)
- **엔티티:** BaseEntity 상속 (UUID v4 PK, createdAt, updatedAt)
- **삭제 전략:** User만 soft delete, Trip은 hard delete + status
- **환경변수:** `@nestjs/config` ConfigService 주입 (직접 `process.env` 사용 금지)
- **enum 네이밍:** 테이블명 기반 (`pois_category_enum`)
- **모듈 구조:** Feature 단위 모듈 (controller + service + entity + dto)

## 배포

- **Railway:** Dockerfile 4-stage 빌드 (deps → prod-deps → build → production)
- **마이그레이션:** `preDeployCommand`로 배포 전 자동 실행
- **Health check:** `/api/v1` (300s timeout)
