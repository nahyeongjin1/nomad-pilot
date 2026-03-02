# T06a: 항공 API 연동 (Amadeus + Travelpayouts)

## Context

T05(POI 파이프라인) 완료 후 다음 단계. PRD 여정상 항공 검색이 도시 선택의 진입점이며, 숙소(T06b)는 제휴 승인 대기 중이므로 항공부터 진행.

**목표**: 사용자가 출발일/귀국일을 입력하면 일본 6개 도시별 최저가 항공편을 비교하고, 예약 딥링크를 제공한다.

## 아키텍처

```text
[Client] → GET /flights/cheapest-cities → [FlightsService]
                                              ├── [AmadeusService] → Amadeus API (검색)
                                              ├── [DeeplinkService] → Travelpayouts URL 생성
                                              └── [CacheManager] → 인메모리 캐시 (15분 TTL)

[Client] → GET /flights/search → 특정 노선 검색 (동일 구조)
```

- **DB 변경 없음**: 항공 검색 결과는 pass-through (비저장)
- **새 패키지**: `@nestjs/cache-manager`, `cache-manager`
- **기존 활용**: `@nestjs/axios` (이미 설치됨), City 엔티티 (`iataCodes`)

## 모듈 구조

```text
src/flights/
  flights.module.ts
  flights.controller.ts
  flights.service.ts
  amadeus.service.ts
  deeplink.service.ts
  dto/
    search-flights.dto.ts
    cheapest-cities.dto.ts
    flight-offer.dto.ts
  interfaces/
    amadeus.interfaces.ts
```

## API 엔드포인트

### `GET /api/v1/flights/search`

특정 노선 항공편 검색.

| 파라미터      | 타입      | 필수 | 기본값 | 설명                |
| ------------- | --------- | ---- | ------ | ------------------- |
| origin        | string(3) | O    | -      | 출발 IATA (예: ICN) |
| destination   | string(3) | O    | -      | 도착 IATA (예: NRT) |
| departureDate | string    | O    | -      | YYYY-MM-DD          |
| returnDate    | string    | X    | -      | 왕복 시             |
| adults        | int       | X    | 1      | 승객 수 (1-9)       |
| nonStop       | boolean   | X    | false  | 직항만              |
| max           | int       | X    | 5      | 최대 결과 수 (1-10) |

### `GET /api/v1/flights/cheapest-cities`

일본 6개 도시 최저가 비교.

| 파라미터      | 타입      | 필수 | 기본값 | 설명             |
| ------------- | --------- | ---- | ------ | ---------------- |
| origin        | string(3) | X    | ICN    | 출발 IATA        |
| departureDate | string    | O    | -      | YYYY-MM-DD       |
| returnDate    | string    | X    | -      | 왕복 시          |
| adults        | int       | X    | 1      | 승객 수          |
| maxPerCity    | int       | X    | 3      | 도시당 최대 결과 |

## 핵심 서비스 설계

### AmadeusService

- OAuth2 client_credentials, 30분 유효, 만료 60초 전 자동 갱신
- 동시성: 토큰 갱신 Promise를 공유하여 thundering herd 방지
- 재시도: 401 시 토큰 갱신 후 1회 재시도
- 에러 매핑: 429→ServiceUnavailable, 400→BadRequest, 5xx→BadGateway
- HTTP: `@nestjs/axios` HttpService, `firstValueFrom`으로 Observable→Promise
- 타임아웃: 10초

### DeeplinkService

- 순수 함수: 외부 API 호출 없음, URL 조합만
- Aviasales 검색 URL: `https://www.aviasales.com/search/{params}`
- Travelpayouts 래핑: `https://c111.travelpayouts.com/click?shmarker={MARKER}&...&custom_url={ENCODED}`
- MARKER 미설정 시: 원본 Aviasales URL 반환

### FlightsService

- 캐시 키: `flights:{origin}:{dest}:{depDate}:{retDate|ow}:{adults}:{nonStop}`
- TTL: 15분
- 변환: Amadeus 응답 → FlightOfferDto
- cheapestCities: City 테이블에서 active JP 도시 조회 → 도시별 searchFlights 병렬 → 가격순 정렬

## 환경 변수

```env
AMADEUS_CLIENT_ID=
AMADEUS_CLIENT_SECRET=
AMADEUS_BASE_URL=https://test.api.amadeus.com
TRAVELPAYOUTS_MARKER=
```

## 구현 순서 (TDD)

| 단계 | 작업                                         | TDD                |
| ---- | -------------------------------------------- | ------------------ |
| 0    | 계획서 + 브랜치 생성 + task-tracker 업데이트 | -                  |
| 1    | 패키지 설치                                  | -                  |
| 2    | Amadeus 인터페이스 정의                      | -                  |
| 3    | 요청/응답 DTO 정의                           | -                  |
| 4    | DeeplinkService 구현                         | RED→GREEN→REFACTOR |
| 5    | AmadeusService 구현                          | RED→GREEN→REFACTOR |
| 6    | FlightsService 구현                          | RED→GREEN→REFACTOR |
| 7    | FlightsController 구현                       | RED→GREEN→REFACTOR |
| 8    | FlightsModule + AppModule 연결               | -                  |
| 9    | .env.example 업데이트                        | -                  |
| 10   | 전체 테스트 통과 확인                        | -                  |
