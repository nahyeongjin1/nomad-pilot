import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SegmentDto {
  @ApiProperty({ example: 'ICN' })
  departureAirport!: string;

  @ApiProperty({ example: '2026-04-01T10:00:00' })
  departureAt!: string;

  @ApiPropertyOptional({ example: '1' })
  departureTerminal?: string;

  @ApiProperty({ example: 'NRT' })
  arrivalAirport!: string;

  @ApiProperty({ example: '2026-04-01T13:30:00' })
  arrivalAt!: string;

  @ApiPropertyOptional({ example: '1' })
  arrivalTerminal?: string;

  @ApiProperty({ example: 'KE' })
  carrierCode!: string;

  @ApiPropertyOptional({ example: 'Korean Air' })
  carrierName?: string;

  @ApiProperty({ example: '713' })
  flightNumber!: string;

  @ApiProperty({ example: 'PT2H30M' })
  duration!: string;

  @ApiProperty({ example: 0 })
  numberOfStops!: number;
}

export class ItineraryDto {
  @ApiProperty({ example: 'PT2H30M' })
  duration!: string;

  @ApiProperty({ type: [SegmentDto] })
  segments!: SegmentDto[];
}

export class FlightOfferDto {
  @ApiProperty({ example: 'KRW' })
  currency!: string;

  @ApiProperty({ example: 250000 })
  totalPrice!: number;

  @ApiProperty({ type: [ItineraryDto] })
  itineraries!: ItineraryDto[];

  @ApiProperty({ example: ['KE'] })
  airlines!: string[];

  @ApiProperty({ example: 'https://aviasales.com/search/...' })
  deeplink!: string;

  @ApiPropertyOptional({ example: '2026-03-01T12:00:00.000Z' })
  cachedAt?: string;
}

export class CityFlightsDto {
  @ApiProperty({ example: 'Tokyo' })
  cityNameEn!: string;

  @ApiProperty({ example: '도쿄' })
  cityNameKo!: string;

  @ApiProperty({ example: ['NRT', 'HND'] })
  iataCodes!: string[];

  @ApiProperty({ type: [FlightOfferDto] })
  offers!: FlightOfferDto[];

  @ApiPropertyOptional({ example: 250000 })
  cheapestPrice?: number;
}

export class CheapestCitiesResponseDto {
  @ApiProperty({ type: [CityFlightsDto] })
  cities!: CityFlightsDto[];

  @ApiProperty({ example: 'ICN' })
  origin!: string;

  @ApiProperty({ example: '2026-04-01' })
  departureDate!: string;

  @ApiPropertyOptional({ example: '2026-04-07' })
  returnDate?: string;
}
