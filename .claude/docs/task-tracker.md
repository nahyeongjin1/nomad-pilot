# 태스크 추적

상태: ⬜ 미착수 | 🔄 진행중 | ✅ 완료

## Foundation

| ID  | 태스크                                | 상태 | 계획서                             |
| --- | ------------------------------------- | ---- | ---------------------------------- |
| T01 | 프로젝트 초기 설정 (NestJS + Railway) | ✅   | .claude/plans/t01-project-setup.md |
| T02 | DB 스키마 설계 (PostGIS)              | ✅   | .claude/plans/t02-db-schema.md     |
| T03 | 공간 쿼리 최적화 전략                 | ✅   | .claude/plans/t03-spatial-query.md |

## Search & Data

| ID   | 태스크                                  | 상태 | 계획서                            |
| ---- | --------------------------------------- | ---- | --------------------------------- |
| T04  | POI 검색 설계 (pg_trgm)                 | ✅   | .claude/plans/t04-poi-search.md   |
| T05  | 일본 POI 데이터 파이프라인              | ✅   | .claude/plans/t05-poi-pipeline.md |
| T06a | 항공 API 연동 (Amadeus + Travelpayouts) | ✅   | .claude/plans/t06a-flight-api.md  |
| T06b | 숙소 검색 연동 (제휴 없이 일반 링크)    | ⬜   | -                                 |

## Core Engine

| ID  | 태스크               | 상태 | 계획서 |
| --- | -------------------- | ---- | ------ |
| T07 | 예산 분배 로직       | ⬜   | -      |
| T08 | 경로 최적화 알고리즘 | ⬜   | -      |
| T09 | 숙소 위치 추천 로직  | ⬜   | -      |
| T10 | 주변 POI 추천 로직   | ⬜   | -      |
| T11 | AI Integration       | ⬜   | -      |

## 여행 중 지원

| ID  | 태스크                 | 상태 | 계획서 |
| --- | ---------------------- | ---- | ------ |
| T12 | 일정 재스케줄링 엔진   | ⬜   | -      |
| T13 | Client Geofencing 설계 | ⬜   | -      |
| T14 | Web Push 알림 설계     | ⬜   | -      |

## Frontend

| ID   | 태스크                                          | 상태 | 계획서                               |
| ---- | ----------------------------------------------- | ---- | ------------------------------------ |
| T15a | 프론트 프로젝트 셋업 + Vercel 배포              | ✅   | .claude/plans/t15a-frontend-setup.md |
| T15b | 레이아웃 + 디자인 시스템 (shadcn/ui + Tailwind) | ✅   | .claude/plans/t15b-layout-design.md  |
| T15c | PWA 기초 설정 (manifest, SW, 앱 설치)           | ⬜   | -                                    |
| T21  | 도시 탐색 화면                                  | ⬜   | -                                    |
| T22  | 항공편 검색 화면                                | ⬜   | -                                    |
| T16  | 지도 + POI 탐색 화면                            | ⬜   | -                                    |

## Monetization

| ID  | 태스크                    | 상태 | 계획서 |
| --- | ------------------------- | ---- | ------ |
| T17 | 인증/결제 시스템          | ⬜   | -      |
| T18 | Pilot Pass 기능 게이팅    | ⬜   | -      |
| T19 | 딥링크/제휴 수수료 트래킹 | ⬜   | -      |

## Infra & DevOps

| ID  | 태스크                                  | 상태 | 계획서                      |
| --- | --------------------------------------- | ---- | --------------------------- |
| T20 | 배포 아키텍처 (Vercel + Railway, CI/CD) | ✅   | .claude/plans/t20-deploy.md |
