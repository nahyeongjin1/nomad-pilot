import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CitiesService } from './cities.service.js';
import { CityDto } from './dto/city.dto.js';

@ApiTags('Cities')
@Controller('cities')
export class CitiesController {
  constructor(private readonly citiesService: CitiesService) {}

  @Get()
  @ApiOperation({ summary: 'List active cities' })
  @ApiOkResponse({ type: [CityDto] })
  async findAll(): Promise<CityDto[]> {
    return this.citiesService.findActive();
  }
}
