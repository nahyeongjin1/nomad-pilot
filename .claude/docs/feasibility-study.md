# Nomad-Pilot 기술 Feasibility Study

> 조사일: 2026-02-12 | Status: **Confirmed**

---

## 목적

PRD에 명시된 핵심 외부 의존성들의 실제 가용성, 비용, 제약 사항을 검증한다.
DB 스키마나 코드를 작성하기 전에, 프로덕트가 기술적으로 성립하는지 확인하는 단계.

---

## 1. 항공 API — 가능

### 채택 전략: Amadeus (검색) + Kiwi/Travelpayouts (수익화)

검색 데이터와 수익화 채널을 분리하는 2-layer 구조.

#### 검색 엔진: Amadeus Self-Service API

- Flight Inspiration Search: 출발지만 넣으면 최저가 목적지 리스트 반환 → 우리 핵심 유스케이스에 정확히 매칭
- Flight Cheapest Date Search: 출발지+도착지 확정 후 가장 싼 날짜 탐색
- 무료 티어: 1,000~10,000콜/월 (API별 상이)
- 초과 시: EUR 0.0008~0.025/콜
- Rate Limit: 테스트 10 req/sec, 프로덕션 40 req/sec
- 제휴 수수료 모델 없음 (순수 데이터 API)

#### 수익화 레이어: Kiwi Tequila + Travelpayouts

- Amadeus로 최저가 목적지를 찾은 후, Kiwi/Travelpayouts 딥링크로 실제 예약 유도
- Kiwi: 무료 API, 3% 예약 수수료, NOMAD API(다중 도시 검색) 보유. 단, 제휴 프로그램은 5만 MAU 요구
- Travelpayouts: 무료 (200 req/hr), 수수료 100% 패스스루, 진입장벽 낮음

### 탈락 옵션(항공)

| API            | 탈락 사유                                                |
| -------------- | -------------------------------------------------------- |
| Skyscanner     | 승인 파트너만 접근 가능. 초기 프로젝트 거절 가능성 높음  |
| Google Flights | 공개 API 없음 (2018년 QPX Express 폐지)                  |
| AviationStack  | 항공편 추적 전용. 가격/예약 데이터 없음                  |
| Duffel         | OTA를 직접 운영해야 함 (결제, CS 등). 우리 모델과 불일치 |

---

## 2. 숙소 API — 가능 (조건부)

### 채택 전략: Booking.com 우선, Agoda 보조

#### Booking.com Demand API

- 무료 (승인 후). 위치+날짜+예산 검색 가능
- 딥링크 빌더 제공 (Affiliate Partner Centre)
- 수수료: 예약 금액 대비 실효 ~3.75~8% (티어별)
- Rate Limit: 50 req/min
- **주의: 승인 시 웹사이트/트래픽 필요** → MVP 런칭 후 신청

#### Agoda Search API (보조/초기)

- 가입 쉬움, 심사 빠름
- 수수료 4~7% (건당 $10 상한)
- 쿠키 1일 (매우 짧음) → 전환율 불리
- MVP 초기에 숙소 딥링크가 필요할 때 먼저 활용

### 탈락 옵션(숙소)

| API                     | 탈락 사유                                          |
| ----------------------- | -------------------------------------------------- |
| Airbnb                  | 공개 API 없음. 초대제만                            |
| Hotellook/Travelpayouts | 2025년 10월 서비스 종료                            |
| Expedia Rapid           | 통합 복잡도 높음. 승인 까다로움. Phase 2 이후 고려 |

---

## 3. POI 데이터 — 하이브리드 전략

### 채택 전략: OSM (기본) + Google Places (on-demand 보강)

단일 API로는 불가능. 비용과 데이터 품질의 균형점 필요.

#### Layer 1: OpenStreetMap (기본 POI 데이터베이스)

- 무료, ODbL 라이선스 (저장/캐싱 가능, 출처 표기 필수)
- 전 세계 POI: 이름, 위치, 카테고리, 주소, 영업시간(일부)
- 유럽/일본 커버리지 우수
- 한계: 평점, 리뷰, 사진 없음 → Layer 2로 보강

#### Layer 2: Google Maps JS API Places Library (상세 조회 시 on-demand)

- 사용자가 특정 POI 상세를 볼 때만 호출 (비용 최적화)
- **호출 주체: 클라이언트(브라우저)**
  - Google은 브라우저용(**Maps JS API**)과 서버용(**Places API REST**)을 별개 API로 제공
  - Maps JS API Places Library는 브라우저에서 사용하도록 설계된 공식 패턴
  - ToS상 DB 저장 불가한 데이터를 서버 경유할 이유 없음. 클라이언트→Google Edge 직접 호출로 RTT 최소화
- Enterprise 티어: $35/1K (평점, 영업시간, 가격대 포함)
- 무료: 1,000콜/월 (Enterprise)
- place_id만 DB 저장 가능 → fire & forget 패턴으로 백엔드에 비동기 저장. POI별 공유 데이터라 한 유저가 매칭하면 모든 유저가 혜택
- 캐싱 불가 정책: 데이터 저장 금지, 실시간 호출 필수
- **API 키 보안 (다층 방어)**:
  - HTTP Referrer 제한 (Google Console에서 허용 도메인 설정)
  - API 제한 (Maps JavaScript API만 허용)
  - 일일 할당량 캡 (초과 시 API 중단)
  - **Firebase App Check + reCAPTCHA** (런칭 전 적용. Referrer 우회 공격 차단)
  - 브라우저 키와 서버 키 분리 필수

#### 비용 시뮬레이션 (MVP)

| 시나리오          | 월간 POI 상세 조회 | Google 비용 |
| ----------------- | ------------------ | ----------- |
| DAU 100, 인당 5회 | ~15,000콜          | ~$490/월    |
| DAU 100, 인당 2회 | ~6,000콜           | ~$175/월    |
| 무료 티어만       | 1,000콜            | $0          |

→ **MVP 초기에는 무료 티어로 시작.**

### 탈락/보류 옵션

| 소스        | 상태 | 사유                                                                                 |
| ----------- | ---- | ------------------------------------------------------------------------------------ |
| Foursquare  | 탈락 | Premium 데이터 무료 티어 없음 ($18.75/1K), Google과 동일 캐싱 제한, 지역 확장 리스크 |
| TripAdvisor | 보류 | 5K/월 무료, 승인 필요. 데이터 품질 좋으나 접근성 불확실                              |
| Yelp        | 탈락 | 아시아 커버리지 부족. 미국 외 사실상 무용                                            |
| HERE        | 탈락 | 평점/리뷰 없음. 지오코딩 용도에만 적합                                               |

---

## 4. Railway + PostGIS — 가능

### 결론: 원클릭 배포 가능

- Railway 기본 PostgreSQL에는 PostGIS 미포함
- **PG 17 + PostGIS 3.5 템플릿** 원클릭 배포 지원
- Hobby 플랜($5/월) 이상 필요 (이미 계획에 포함)
- 배포 후 `CREATE EXTENSION IF NOT EXISTS postgis;` 실행으로 활성화

### 주의사항

- 기본 PostgreSQL과 별도 서비스로 배포됨 (연결 변수 다름)
- 기본 SHM 64MB → 무거운 공간 연산 시 `RAILWAY_SHM_SIZE_BYTES`로 조정 가능
- 스토리지는 볼륨 사용량 기반 별도 과금

---

## 5. LLM API 비용 — 미조사 (다음 단계)

경로 최적화에 LLM을 얼마나 활용할지에 따라 비용 구조가 달라짐.
T11(AI Integration) 설계 시 상세 조사 예정.

---

## 종합 판정

| 의존성          | 결과       | 리스크 수준 | 비고                                                |
| --------------- | ---------- | ----------- | --------------------------------------------------- |
| 항공 API        | **가능**   | 낮음        | Amadeus 무료 티어 + Kiwi 딥링크                     |
| 숙소 API        | **가능**   | 중간        | Booking.com 승인에 웹사이트 필요. Agoda로 초기 대응 |
| POI 데이터      | **가능**   | 중간        | OSM 무료 + Google on-demand. 비용 관리 필요         |
| Railway PostGIS | **가능**   | 낮음        | 원클릭 템플릿 존재                                  |
| LLM API         | **미조사** | 미정        | T11에서 확인                                        |

**블로커 없음. 개발 진행 가능.**
