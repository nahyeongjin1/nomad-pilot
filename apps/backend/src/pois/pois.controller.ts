import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';
import {
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { PoisService } from './pois.service.js';
import { PatchPoiDto } from './dto/patch-poi.dto.js';

@ApiTags('POIs')
@Controller('pois')
export class PoisController {
  constructor(private readonly poisService: PoisService) {}

  @Patch(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Store Google Place ID for a POI (fire & forget)' })
  @ApiNoContentResponse({ description: 'Place ID stored (or already existed)' })
  @ApiNotFoundResponse({ description: 'POI not found' })
  async patchGooglePlaceId(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PatchPoiDto,
  ): Promise<void> {
    await this.poisService.patchGooglePlaceId(id, dto.googlePlaceId);
  }
}
