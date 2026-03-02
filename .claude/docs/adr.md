# 의사결정 로그 (ADR)

> Architecture Decision Records. 프로젝트 전체에 걸친 설계 결정을 기록한다.

| 날짜       | 결정                                             | 근거                                                                                                                                               |
| ---------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-02-12 | 서빙 형식: PWA                                   | 진입장벽 최소화, 오프라인 지원, 해외 즉시 접근                                                                                                     |
| 2026-02-12 | 문서 관리: .claude/ 내부                         | 코드와 문서 분리, docs/ + plans/ 구조, CLAUDE.md 허브 방식                                                                                         |
| 2026-02-12 | 방향: 최저가 여행 파일럿                         | 가치 제안 명확화, 타겟 확장, 수익화 경로 다양화                                                                                                    |
| 2026-02-12 | MVP 1인 여행 고정                                | 그룹 복잡도 회피, DB 확장 가능 설계, 그룹은 Phase 3 유료                                                                                           |
| 2026-02-12 | WebSocket 전면 제거                              | REST + Web Push + Client Geofencing 대체. 해외 데이터 절약                                                                                         |
| 2026-02-12 | 동행자 위치: 1회 조회 방식                       | 실시간 불필요, REST 조회로 충분                                                                                                                    |
| 2026-02-12 | 인프라: Vercel + Railway                         | Frontend $0 + Backend/DB $5/월. NestJS 학습 목적 유지                                                                                              |
| 2026-02-12 | MVP DB 단일화: PostgreSQL만                      | ES/Redis 스케일링 시 도입. tsvector+GIN 텍스트 검색, PostGIS 공간 검색                                                                             |
| 2026-02-12 | MVP 일본 한정                                    | 한국인 해외여행 1위, OSM 품질 우수, 스코프 축소. .claude/docs/feasibility-study.md                                                                 |
| 2026-02-12 | 항공: Amadeus + Kiwi (딥링크→Travelpayouts 대체) | Amadeus(검색) 유지. Kiwi 딥링크는 2026-03-01 ADR로 Travelpayouts 대체                                                                              |
| 2026-02-12 | POI: OSM + Google Places                         | OSM(기본, 무료) + Google(on-demand). .claude/docs/feasibility-study.md §3                                                                          |
| 2026-02-12 | 개발 방식: TDD                                   | 테스트 먼저 작성 → 구현 → 리팩터. 모든 서비스/로직에 테스트 필수                                                                                   |
| 2026-02-12 | Git: GitHub Flow                                 | main + feat/fix 브랜치. 태스크 단위 브랜치 → main 머지. develop 불필요 (1인 MVP)                                                                   |
| 2026-02-12 | 로깅: Pino (nestjs-pino)                         | JSON 네이티브, 요청별 자동 로깅. dev: pino-pretty, prod: JSON. Railway stdout 수집                                                                 |
| 2026-02-25 | 예산: 정규화 테이블                              | budget_allocations 별도 테이블. 다통화/다국가 확장 대비. 환율 스냅샷 저장                                                                          |
| 2026-02-25 | POI 이름: name+nameLocal+locale                  | 표시용(name) + 현지어(nameLocal) + 로케일. City는 curated라 3컬럼(ko/en/local)                                                                     |
| 2026-02-25 | DB 네이밍: SnakeNamingStrategy                   | 커스텀 구현 (~30줄). TypeORM camelCase → PostgreSQL snake_case 자동 변환                                                                           |
| 2026-02-25 | 삭제 전략: User만 soft delete                    | Trip은 hard delete + status로 비즈니스 상태 관리. email unique 제약 유지                                                                           |
| 2026-02-25 | 마이그레이션 CLI: dist 경로 사용                 | ts-node의 .js→.ts 리졸브 문제 회피. 빌드 후 dist/ 참조                                                                                             |
| 2026-02-25 | PR 머지: squash + 브랜치 삭제                    | main 히스토리 깔끔 유지. 머지 후 feature 브랜치 즉시 삭제                                                                                          |
| 2026-02-26 | 공간 쿼리: geography 타입 유지                   | 1km 반경 20ms 이내 달성. geometry 전환 불필요. .claude/plans/t03-spatial-query.md                                                                  |
| 2026-02-26 | 공간 인덱스: 단일 GiST 유지                      | GiST + 기존 B-tree 조합으로 충분. 복합 인덱스 불필요. 10만건 이상 시 재검토                                                                        |
| 2026-02-26 | 반경 검색: 2km 이상 시 필터 필수                 | 2km 무필터 262ms vs 필터 26ms. 서비스 레이어에서 category 필터 강제                                                                                |
| 2026-02-28 | 텍스트 검색: tsvector→pg_trgm                    | CJK 언어 토큰화 불가. pg_trgm은 언어 무관. .claude/plans/t04-poi-search.md                                                                         |
| 2026-02-28 | pg_trgm 인덱스: GIN 선택                         | GIN이 ILIKE/similarity 2~3배 우수. GiST KNN은 city_id 필터 후 장점 없음                                                                            |
| 2026-02-28 | S3 키워드+반경: 쿼리 분리 권장                   | ST_DWithin+ILIKE 조합 70ms. 서비스에서 반경/텍스트 분리 쿼리 후 조합                                                                               |
| 2026-02-28 | POI 보강: Foursquare 탈락                        | Premium 무료 티어 없음, Google과 동일 캐싱 제한, Phase 2/3 마이그레이션 리스크                                                                     |
| 2026-02-28 | Google Places: Maps JS API Places Library        | 브라우저용(Maps JS API)과 서버용(Places REST)은 별개 API. 클라이언트→Google Edge 직접이 RTT 최소화                                                 |
| 2026-02-28 | API 키 보안: 다층 방어                           | Referrer 제한만 불충분. API 제한 + 일일 캡 + Firebase App Check(reCAPTCHA) 적용. 키 분리 필수                                                      |
| 2026-02-28 | place_id 저장: fire & forget                     | 클라이언트가 비동기 PATCH. POI별 공유 → 커뮤니티 캐시 효과. 실패 시 다음 유저 재매칭                                                               |
| 2026-02-28 | Railway 리전: 싱가포르                           | 일본→SG ~50-70ms. 클라이언트 직접 Google 호출이 여전히 우위                                                                                        |
| 2026-02-28 | 인증: Google + Kakao 소셜 로그인만               | 비밀번호 저장 안 함. 한국인 타겟이라 Kakao 필수 + Google 글로벌 표준. Apple은 Phase 2                                                              |
| 2026-02-28 | 가입 벽: Trip 생성 시점                          | 탐색(도시/항공/POI)은 비로그인 허용. Trip 저장 시 로그인 요구. 딥링크 수수료는 비로그인도 발생                                                     |
| 2026-02-28 | place_id PATCH: 비로그인 허용                    | 멱등성(최초 1회만 저장) + 포맷 검증(non-empty, 불투명 문자열)으로 구조적 안전. rate limit 불필요                                                   |
| 2026-02-28 | OSM 파이프라인: UPSERT + 비활성화 감지           | ON CONFLICT DO UPDATE. last_synced_at으로 삭제된 POI 감지 → is_active=false. 하드 삭제 안 함                                                       |
| 2026-02-28 | 이름 우선순위: name:ko 최우선                    | MVP 한국어 사용자 대상. name:ko > name:en > name > name:ja. 향후 로케일별 우선순위 확장 가능                                                       |
| 2026-02-28 | opening_hours: raw 문자열 보존                   | OSM opening_hours 복잡한 형식. MVP는 { raw, parsed: false } jsonb 저장. 고급 파싱은 향후 처리                                                      |
| 2026-03-01 | T06 분리: 항공(T06a) / 숙소(T06b)                | 숙소 API는 제휴 승인 필요(Agoda/Booking). 항공은 즉시 시작 가능(Amadeus+Travelpayouts). PRD 여정상 항공이 선행                                     |
| 2026-03-01 | 항공 딥링크: Travelpayouts 우선                  | Kiwi 5만 MAU 요구로 MVP 비현실적. Travelpayouts 진입장벽 낮음, 수수료 100% 패스스루                                                                |
| 2026-03-01 | 캐싱: 인메모리 우선                              | ADR에 따라 Redis는 동시 사용자 증가 시 도입. MVP는 @nestjs/cache-manager 기본 store로 시작                                                         |
| 2026-03-02 | 딥링크: Aviasales compact URL + tp.media         | `search.aviasales.com/flights/`와 `/searches/new` 모두 리다이렉트 실패. `aviasales.com/?params=` compact 포맷 사용. tp.media/r로 어필리에이트 추적 |
| 2026-03-02 | Aviasales locale: 자동 감지                      | compact URL은 locale/currency 파라미터 미지원. ko/KRW도 Aviasales 미지원. 브라우저 기반 자동 감지(en/USD) 사용                                     |
| 2026-03-02 | CI: GitHub Actions (lint+build+test)             | PR/push 시 자동 실행. path filter로 backend 변경분만 트리거. Railway "Wait for CI" 연동                                                            |
| 2026-03-02 | 마이그레이션: Railway preDeployCommand           | entrypoint.sh 대신 Railway 공식 preDeployCommand 사용. 실패 시 배포 자체 중단. 앱 시작과 분리                                                      |
| 2026-03-02 | T20 선행: CI/CD 우선 구축                        | T06a 완료 후 배포 파이프라인 부재. 이후 태스크 배포 검증을 위해 인프라 선행                                                                        |
