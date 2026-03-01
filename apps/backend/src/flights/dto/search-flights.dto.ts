import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class SearchFlightsDto {
  @ApiProperty({ example: 'ICN', description: 'Origin IATA code' })
  @IsString()
  @Length(3, 3)
  @Transform(({ value }) => (value as string).toUpperCase())
  origin!: string;

  @ApiProperty({ example: 'NRT', description: 'Destination IATA code' })
  @IsString()
  @Length(3, 3)
  @Transform(({ value }) => (value as string).toUpperCase())
  destination!: string;

  @ApiProperty({
    example: '2026-04-01',
    description: 'Departure date (YYYY-MM-DD)',
  })
  @IsDateString()
  departureDate!: string;

  @ApiPropertyOptional({
    example: '2026-04-07',
    description: 'Return date (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString()
  returnDate?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Number of adult passengers (1-9)',
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(9)
  @Transform(({ value }) => parseInt(value as string, 10))
  adults?: number;

  @ApiPropertyOptional({ description: 'Non-stop flights only', default: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  nonStop?: boolean;

  @ApiPropertyOptional({
    example: 5,
    description: 'Max results (1-10)',
    default: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  @Transform(({ value }) => parseInt(value as string, 10))
  max?: number;
}
