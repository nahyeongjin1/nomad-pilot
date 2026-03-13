import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class FlexibleSearchDto {
  @ApiPropertyOptional({
    example: 'ICN,GMP',
    description: 'Comma-separated origin IATA codes',
    default: 'ICN,GMP',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value as string).toUpperCase())
  origins?: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'City ID (UUID) — backend resolves to IATA codes',
  })
  @IsUUID()
  destination!: string;

  @ApiProperty({
    example: '2026-03-13',
    description: 'Departure range start (YYYY-MM-DD)',
  })
  @IsDateString()
  dateFrom!: string;

  @ApiProperty({
    example: '2026-03-15',
    description: 'Departure range end (YYYY-MM-DD)',
  })
  @IsDateString()
  dateTo!: string;

  @ApiProperty({ example: 1, description: 'Min nights in destination' })
  @IsInt()
  @Min(1)
  @Max(14)
  @Transform(({ value }) => parseInt(value as string, 10))
  nightsFrom!: number;

  @ApiProperty({ example: 3, description: 'Max nights in destination' })
  @IsInt()
  @Min(1)
  @Max(14)
  @Transform(({ value }) => parseInt(value as string, 10))
  nightsTo!: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Number of adults (1-9)',
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(9)
  @Transform(({ value }) =>
    value != null ? parseInt(value as string, 10) : undefined,
  )
  adults?: number;

  @ApiPropertyOptional({
    example: 20,
    description: 'Max results to return',
    default: 20,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  @Transform(({ value }) =>
    value != null ? parseInt(value as string, 10) : undefined,
  )
  maxResults?: number;
}
