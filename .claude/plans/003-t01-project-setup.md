# T01: 프로젝트 초기 설정 (NestJS + Railway) 실행 계획

## Context

Nomad-Pilot 백엔드의 첫 번째 태스크. 프로젝트가 아직 빈 디렉토리이므로, NestJS 프로젝트 스캐폴딩부터 로컬 개발환경 구성, Railway 배포 준비까지 **개발 기반**을 마련한다.

**스코프:** 프로젝트 부트스트랩 + DB 연결 + 배포 준비까지만. Auth, 도메인 엔티티 등은 T02 이후.

---

## 기술 선택 (확정)

| 항목            | 선택                        | 비고                            |
| --------------- | --------------------------- | ------------------------------- |
| Framework       | NestJS 11                   | 최신 안정 버전                  |
| Package Manager | pnpm                        | 사용자 선택                     |
| ORM             | TypeORM                     | PostGIS geography 네이티브 지원 |
| Node            | 22 LTS                      |                                 |
| DB              | PostgreSQL 17 + PostGIS 3.5 |                                 |
| Docker 이미지   | `postgis/postgis:17-3.5`    |                                 |

---

## 실행 순서

### Step 1: NestJS 프로젝트 생성

```bash
pnpm add -g @nestjs/cli
nest new nomad-pilot --package-manager pnpm --strict
pnpm approve-builds  # NestJS 11 빌드 스크립트 승인
```

생성 위치: `/home/skgudwls/toy-project/nomad-pilot/` (현재 디렉토리에 직접)

### Step 2: 핵심 패키지 설치

```bash
# Core
pnpm add @nestjs/config @nestjs/typeorm typeorm pg
pnpm add class-validator class-transformer
pnpm add @nestjs/swagger

# PostGIS 타입
pnpm add -D @types/geojson

# HTTP Client (외부 API 호출용)
pnpm add @nestjs/axios axios

# Migration CLI 지원
pnpm add -D tsconfig-paths
```

> Auth 패키지(JWT, Passport, bcrypt)는 T02 이후 설치.

### Step 3: 디렉토리 구조 생성

```text
src/
  main.ts                    # Bootstrap, 글로벌 파이프, Swagger
  app.module.ts              # 루트 모듈
  app.controller.ts          # Health-check (/api/v1)

  common/                    # 공유 유틸리티
    constants/
    decorators/
    filters/
    guards/
    interceptors/
    pipes/
    dto/

  config/                    # 설정 모듈
    config.module.ts
    database.config.ts
    app.config.ts

  database/                  # DB 모듈
    database.module.ts       # TypeOrmModule.forRootAsync
    migrations/              # TypeORM 마이그레이션
    data-source.ts           # CLI용 DataSource
```

> 도메인 모듈(users, trips, flights, pois 등)은 T02~에서 생성.

### Step 4: 설정 파일들

**`docker-compose.yml`** — 로컬 PostGIS

```yaml
services:
  postgres:
    image: postgis/postgis:17-3.5
    container_name: nomad-pilot-db
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: nomad_pilot
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U postgres']
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

**`.env`** / **`.env.example`** — 환경변수

```env
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=nomad_pilot
CORS_ORIGIN=http://localhost:5173
```

**`.gitignore`** 추가 항목: `.env`, `.env.local`, `dist/`

### Step 5: TypeORM + PostGIS 연결

**`src/database/database.module.ts`**

- `TypeOrmModule.forRootAsync` + `ConfigService` 주입
- `autoLoadEntities: true`, `synchronize: false`
- Railway에서는 `DATABASE_URL`, 로컬에서는 개별 파라미터

**`src/database/data-source.ts`**

- CLI 마이그레이션용 DataSource export
- `DATABASE_URL` 우선, 개별 파라미터 fallback

**`package.json` 스크립트 추가:**

```json
"typeorm": "ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js",
"migration:generate": "pnpm typeorm migration:generate src/database/migrations/$npm_config_name -d src/database/data-source.ts",
"migration:run": "pnpm typeorm migration:run -d src/database/data-source.ts",
"migration:revert": "pnpm typeorm migration:revert -d src/database/data-source.ts",
"migration:create": "pnpm typeorm migration:create src/database/migrations/$npm_config_name"
```

### Step 6: PostGIS 활성화 마이그레이션

```typescript
// src/database/migrations/0000000000000-EnablePostGIS.ts
CREATE EXTENSION IF NOT EXISTS "postgis";
```

### Step 7: main.ts 글로벌 설정

- API prefix: `/api/v1`
- CORS: `.env`에서 origin 읽기
- `ValidationPipe`: whitelist + forbidNonWhitelisted + transform
- Swagger: dev 환경에서만 `/api` 경로

### Step 8: Railway 배포 준비

> **중요: Railway는 docker-compose를 쓰지 않는다.**
> 각 서비스(NestJS 앱, PostgreSQL+PostGIS)를 **독립적으로 배포**하고,
> Railway 내부 네트워크로 연결한다. `docker-compose.yml`은 **로컬 개발 전용**.

#### Railway 배포 구조

```text
Railway 프로젝트 (1개, Hobby $5/월)
├── 서비스 1: NestJS 앱         ← GitHub 레포 연결 → push마다 자동 빌드/배포
├── 서비스 2: PostgreSQL+PostGIS ← 원클릭 PostGIS 템플릿으로 별도 생성
└── Private Network (Wireguard) ← 서비스 간 자동 연결
```

#### Railway 배포 절차 (수동, 1회)

1. Railway 프로젝트 생성 → "Deploy from GitHub repo" → NestJS 레포 선택
2. `+ New` → PostGIS 원클릭 템플릿 배포 (PG17 + PostGIS 3.5)
3. NestJS 서비스 환경변수 설정:
   - `DATABASE_URL=${{Postgres.DATABASE_URL}}` (Railway 참조 변수)
   - `NODE_ENV=production`
   - `CORS_ORIGIN=https://[vercel-app].vercel.app`
4. GitHub push → Railway가 Dockerfile 감지 → 자동 빌드+배포
5. 마이그레이션: `railway run pnpm migration:run` (Railway CLI)

#### 파일들

**`Dockerfile`** — 멀티스테이지 빌드 (pnpm)

- Stage 1: deps (pnpm install --frozen-lockfile)
- Stage 2: build (pnpm build)
- Stage 3: production (prod deps만 + dist 복사)
- Railway가 Dockerfile을 자동 감지하여 빌드 (Railpack 대신 Dockerfile 우선)

**`railway.toml`**

```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"

[deploy]
healthcheckPath = "/api/v1"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

#### 로컬 vs Railway 연결 비교

| 항목         | 로컬                              | Railway                                   |
| ------------ | --------------------------------- | ----------------------------------------- |
| DB           | docker-compose → `localhost:5432` | PostGIS 템플릿 → 내부 네트워크            |
| 연결         | 개별 파라미터 (DB_HOST 등)        | `DATABASE_URL=${{Postgres.DATABASE_URL}}` |
| 빌드         | `pnpm start:dev`                  | Dockerfile → 자동 빌드                    |
| 마이그레이션 | `pnpm migration:run`              | `railway run pnpm migration:run`          |

### Step 9: Git 초기화 + 로컬 검증

```bash
git init
docker compose up -d
pnpm migration:run  # PostGIS 확장 활성화
pnpm start:dev      # http://localhost:3000/api/v1 → 200 OK
```

> Railway 실제 배포는 T20(배포 아키텍처)에서 진행. T01에서는 Dockerfile + railway.toml 준비만.

---

## 핵심 설계 결정

| 결정                      | 선택                               | 이유                               |
| ------------------------- | ---------------------------------- | ---------------------------------- |
| `geography` vs `geometry` | `geography`                        | 지구 곡면 거리 계산 정확 (여행 앱) |
| SRID                      | 4326 (WGS84)                       | GPS 좌표 표준                      |
| `synchronize`             | 항상 `false`                       | 마이그레이션으로만 스키마 변경     |
| PK 타입                   | UUID                               | 순차 ID 노출 방지                  |
| API prefix                | `/api/v1`                          | 버전 관리 시작부터                 |
| SSL                       | `rejectUnauthorized: false` (prod) | Railway PG 자체 서명 인증서        |

---

## 검증 방법

1. **로컬 DB 연결:** `docker compose up -d` → PostGIS 컨테이너 정상 기동
2. **마이그레이션:** `pnpm migration:run` → PostGIS 확장 활성화 확인 (`SELECT PostGIS_Version();`)
3. **서버 기동:** `pnpm start:dev` → `GET /api/v1` 200 응답
4. **Swagger:** `http://localhost:3000/api` 접속 → API 문서 렌더링
5. **Docker 빌드:** `docker build .` → 멀티스테이지 빌드 성공

---

## T01 완료 후 산출물

- NestJS 11 프로젝트 (pnpm, strict TS)
- TypeORM + PostGIS 연결 완료
- Docker Compose 로컬 개발환경
- PostGIS 활성화 마이그레이션
- Swagger API 문서
- Railway 배포 Dockerfile + railway.toml
- `.env.example`, `.gitignore`
- Git 저장소 초기화
