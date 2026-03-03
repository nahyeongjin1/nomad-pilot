# Nomad Pilot

최저가 일본 자유여행 AI 파일럿 PWA

한국 출발 일본 여행에 특화된 가성비 여행 플래너. 항공/숙소/POI 검색부터 예산 분배, 경로 최적화, 현장 리스케줄링까지.

## Tech Stack

| Layer    | Stack                                                               |
| -------- | ------------------------------------------------------------------- |
| Frontend | Vite 7, React 19, TanStack Router/Query, Tailwind CSS v4, shadcn/ui |
| Backend  | NestJS, TypeORM, PostgreSQL + PostGIS                               |
| Infra    | Vercel (Frontend) + Railway (Backend + DB)                          |
| CI       | GitHub Actions (lint, build, test)                                  |

## Project Structure

```text
nomad-pilot/
├── apps/
│   ├── backend/       # NestJS API server
│   └── frontend/      # Vite + React SPA (PWA)
├── packages/
│   └── shared/        # Shared types & utilities
├── .claude/
│   ├── docs/          # PRD, ADR, task tracker
│   └── plans/         # Task implementation plans
└── pnpm-workspace.yaml
```

## Getting Started

```bash
# Install dependencies
pnpm install

# Run both frontend and backend
pnpm dev

# Or individually
pnpm dev:be    # Backend (localhost:3000)
pnpm dev:fe    # Frontend (localhost:5173)
```

## Deployment

- **Frontend**: [nomad-pilot-frontend.vercel.app](https://nomad-pilot-frontend.vercel.app)
- **Backend**: Railway (auto-deploy on main push)

## License

[MIT](./LICENSE)
