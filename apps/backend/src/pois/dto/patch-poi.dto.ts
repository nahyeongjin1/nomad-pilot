import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class PatchPoiDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  googlePlaceId!: string;
}
