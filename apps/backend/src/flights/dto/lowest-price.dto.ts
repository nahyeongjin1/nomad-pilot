import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CityLowestPriceDto {
  @ApiProperty({ example: 'uuid' })
  cityId!: string;

  @ApiProperty({ example: '도쿄' })
  cityNameKo!: string;

  @ApiProperty({ example: 'Tokyo' })
  cityNameEn!: string;

  @ApiPropertyOptional({ example: 150000 })
  lowestPrice!: number | null;

  @ApiProperty({ example: 'KRW' })
  currency!: string;

  @ApiPropertyOptional({ example: 'Aviasales' })
  gate!: string | null;

  @ApiPropertyOptional({ example: 'ICN' })
  originAirport!: string | null;

  @ApiPropertyOptional({ example: '2026-04-01' })
  departDate!: string | null;

  @ApiPropertyOptional({ example: '2026-04-07' })
  returnDate!: string | null;
}

export class LowestPricesResponseDto {
  @ApiProperty({ type: [CityLowestPriceDto] })
  cities!: CityLowestPriceDto[];

  @ApiProperty({ example: ['ICN', 'GMP'] })
  origins!: string[];

  @ApiProperty({ example: '2026-03-07T12:00:00.000Z' })
  cachedAt!: string;
}
