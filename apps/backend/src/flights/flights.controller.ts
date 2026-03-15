import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  FlightsService,
  type FlightSearchParams,
  type CheapestCitiesParams,
  type FlexibleSearchParams,
} from './flights.service.js';
import { SearchFlightsDto } from './dto/search-flights.dto.js';
import { CheapestCitiesDto } from './dto/cheapest-cities.dto.js';
import { FlexibleSearchDto } from './dto/flexible-search.dto.js';
import {
  FlightOfferDto,
  CheapestCitiesResponseDto,
} from './dto/flight-offer.dto.js';
import { LowestPricesResponseDto } from './dto/lowest-price.dto.js';

@ApiTags('Flights')
@Controller('flights')
export class FlightsController {
  constructor(private readonly flightsService: FlightsService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search flight offers for a specific route' })
  @ApiOkResponse({ type: [FlightOfferDto] })
  async search(@Query() dto: SearchFlightsDto): Promise<FlightOfferDto[]> {
    const params: FlightSearchParams = {
      origin: dto.origin,
      destination: dto.destination,
      departureDate: dto.departureDate,
      returnDate: dto.returnDate,
      adults: dto.adults ?? 1,
      nonStop: dto.nonStop ?? false,
      max: dto.max ?? 5,
    };
    return this.flightsService.searchFlights(params);
  }

  @Get('cheapest-cities')
  @ApiOperation({ summary: 'Compare cheapest flights across Japanese cities' })
  @ApiOkResponse({ type: CheapestCitiesResponseDto })
  async cheapestCities(
    @Query() dto: CheapestCitiesDto,
  ): Promise<CheapestCitiesResponseDto> {
    const params: CheapestCitiesParams = {
      origin: dto.origin ?? 'ICN',
      departureDate: dto.departureDate,
      returnDate: dto.returnDate,
      adults: dto.adults ?? 1,
      maxPerCity: dto.maxPerCity ?? 3,
    };
    return this.flightsService.cheapestCities(params);
  }

  @Get('flexible-search')
  @ApiOperation({
    summary: 'Flexible flight search with date range and nights',
  })
  @ApiOkResponse({ type: [FlightOfferDto] })
  async flexibleSearch(
    @Query() dto: FlexibleSearchDto,
  ): Promise<FlightOfferDto[]> {
    if (dto.nightsFrom > dto.nightsTo) {
      throw new BadRequestException('nightsFrom must be <= nightsTo');
    }
    const daySpan =
      (new Date(dto.dateTo).getTime() - new Date(dto.dateFrom).getTime()) /
      (1000 * 60 * 60 * 24);
    if (daySpan < 0 || daySpan > 30) {
      throw new BadRequestException(
        'dateFrom~dateTo range must be between 0 and 30 days',
      );
    }
    const origins = (dto.origins ?? 'ICN,GMP')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (origins.length === 0) {
      throw new BadRequestException(
        'origins must include at least one IATA code',
      );
    }
    const params: FlexibleSearchParams = {
      origins,
      destinationCityId: dto.destination,
      dateFrom: dto.dateFrom,
      dateTo: dto.dateTo,
      nightsFrom: dto.nightsFrom,
      nightsTo: dto.nightsTo,
      adults: dto.adults ?? 1,
      maxResults: dto.maxResults ?? 20,
    };
    return this.flightsService.flexibleSearch(params);
  }

  @Get('lowest-prices')
  @ApiOperation({
    summary: 'Get lowest flight prices per city (date-independent)',
  })
  @ApiOkResponse({ type: LowestPricesResponseDto })
  async lowestPrices(): Promise<LowestPricesResponseDto> {
    return this.flightsService.lowestPrices();
  }
}
