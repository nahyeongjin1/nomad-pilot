import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CityDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;

  @ApiProperty({ example: '도쿄' })
  nameKo!: string;

  @ApiProperty({ example: 'Tokyo' })
  nameEn!: string;

  @ApiProperty({ example: '東京' })
  nameLocal!: string;

  @ApiProperty({ example: 'JP' })
  countryCode!: string;

  @ApiPropertyOptional({
    example: 'https://images.unsplash.com/photo-xxx?w=1080',
  })
  imageUrl!: string | null;

  @ApiPropertyOptional({ example: 'John Doe' })
  imageAuthorName!: string | null;

  @ApiPropertyOptional({ example: 'https://unsplash.com/@johndoe' })
  imageAuthorUrl!: string | null;

  @ApiProperty({ example: ['NRT', 'HND'] })
  iataCodes!: string[];
}
