import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FlightsService } from './flights.service.js';
import { SearchFlightsDto } from './dto/search-flights.dto.js';
import { CheapestCitiesDto } from './dto/cheapest-cities.dto.js';
import {
  FlightOfferDto,
  CheapestCitiesResponseDto,
} from './dto/flight-offer.dto.js';

@ApiTags('Flights')
@Controller('flights')
export class FlightsController {
  constructor(private readonly flightsService: FlightsService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search flight offers for a specific route' })
  @ApiOkResponse({ type: [FlightOfferDto] })
  async search(@Query() dto: SearchFlightsDto): Promise<FlightOfferDto[]> {
    return this.flightsService.searchFlights({
      origin: dto.origin,
      destination: dto.destination,
      departureDate: dto.departureDate,
      returnDate: dto.returnDate,
      adults: dto.adults ?? 1,
      nonStop: dto.nonStop ?? false,
      max: dto.max ?? 5,
    });
  }

  @Get('cheapest-cities')
  @ApiOperation({ summary: 'Compare cheapest flights across Japanese cities' })
  @ApiOkResponse({ type: CheapestCitiesResponseDto })
  async cheapestCities(
    @Query() dto: CheapestCitiesDto,
  ): Promise<CheapestCitiesResponseDto> {
    return this.flightsService.cheapestCities({
      origin: dto.origin ?? 'ICN',
      departureDate: dto.departureDate,
      returnDate: dto.returnDate,
      adults: dto.adults ?? 1,
      maxPerCity: dto.maxPerCity ?? 3,
    });
  }
}
