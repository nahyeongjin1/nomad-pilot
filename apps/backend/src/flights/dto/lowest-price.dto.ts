import { ApiProperty } from '@nestjs/swagger';

export class CityLowestPriceDto {
  @ApiProperty({ example: 'uuid' })
  cityId!: string;

  @ApiProperty({ example: '도쿄' })
  cityNameKo!: string;

  @ApiProperty({ example: 'Tokyo' })
  cityNameEn!: string;

  @ApiProperty({ example: 150000, nullable: true })
  lowestPrice!: number | null;

  @ApiProperty({ example: 'KRW' })
  currency!: string;

  @ApiProperty({ example: 'Aviasales', nullable: true })
  gate!: string | null;

  @ApiProperty({ example: 'ICN', nullable: true })
  originAirport!: string | null;

  @ApiProperty({ example: '2026-04-01', nullable: true })
  departDate!: string | null;

  @ApiProperty({ example: '2026-04-07', nullable: true })
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
