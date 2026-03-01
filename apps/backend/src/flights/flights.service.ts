import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Cache } from 'cache-manager';
import { AmadeusService } from './amadeus.service.js';
import { DeeplinkService } from './deeplink.service.js';
import { City } from '../cities/entities/city.entity.js';
import type { AmadeusFlightOffersResponse } from './interfaces/amadeus.interfaces.js';
import type {
  FlightOfferDto,
  CityFlightsDto,
  CheapestCitiesResponseDto,
} from './dto/flight-offer.dto.js';

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

interface SearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults?: number;
  nonStop?: boolean;
  max?: number;
}

interface CheapestCitiesParams {
  origin?: string;
  departureDate: string;
  returnDate?: string;
  adults?: number;
  maxPerCity?: number;
}

@Injectable()
export class FlightsService {
  private readonly logger = new Logger(FlightsService.name);

  constructor(
    private readonly amadeusService: AmadeusService,
    private readonly deeplinkService: DeeplinkService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @InjectRepository(City)
    private readonly cityRepository: Repository<City>,
  ) {}

  async searchFlights(params: SearchParams): Promise<FlightOfferDto[]> {
    const {
      origin,
      destination,
      departureDate,
      returnDate,
      adults = 1,
      nonStop = false,
      max = 5,
    } = params;

    const cacheKey = `flights:${origin}:${destination}:${departureDate}:${returnDate ?? 'ow'}:${adults}:${nonStop}:${max}`;
    const cached = await this.cacheManager.get<FlightOfferDto[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const response = await this.amadeusService.searchFlightOffers({
      origin,
      destination,
      departureDate,
      returnDate,
      adults,
      nonStop,
      max,
    });

    const offers = this.transformOffers(response, {
      origin,
      destination,
      departureDate,
      returnDate,
      adults,
    });

    await this.cacheManager.set(cacheKey, offers, CACHE_TTL_MS);
    return offers;
  }

  async cheapestCities(
    params: CheapestCitiesParams,
  ): Promise<CheapestCitiesResponseDto> {
    const {
      origin = 'ICN',
      departureDate,
      returnDate,
      adults = 1,
      maxPerCity = 3,
    } = params;

    const cities = await this.cityRepository.find({
      where: { countryCode: 'JP', isActive: true },
    });

    // Collect search promises with in-flight dedupe (e.g. KIX shared by Osaka/Kyoto)
    const searchPromises: Array<{
      cityId: string;
      iataCode: string;
      promise: Promise<FlightOfferDto[]>;
    }> = [];
    const inflight = new Map<string, Promise<FlightOfferDto[]>>();

    for (const city of cities) {
      for (const iataCode of city.iataCodes) {
        const key = `${origin}:${iataCode}:${departureDate}:${returnDate ?? 'ow'}:${adults}:${maxPerCity}`;
        let promise = inflight.get(key);
        if (!promise) {
          promise = this.searchFlights({
            origin,
            destination: iataCode,
            departureDate,
            returnDate,
            adults,
            max: maxPerCity,
          });
          inflight.set(key, promise);
        }
        searchPromises.push({ cityId: city.id, iataCode, promise });
      }
    }

    const results = await Promise.allSettled(
      searchPromises.map((sp) => sp.promise),
    );

    // Group results by city
    const cityResults: CityFlightsDto[] = cities.map((city) => {
      const offers: FlightOfferDto[] = [];

      for (let i = 0; i < searchPromises.length; i++) {
        if (searchPromises[i]!.cityId !== city.id) continue;

        const result = results[i]!;
        if (result.status === 'fulfilled') {
          offers.push(...result.value);
        } else {
          this.logger.warn(
            `Failed to search flights for ${searchPromises[i]!.iataCode}: ${result.reason}`,
          );
        }
      }

      // Sort by price and take maxPerCity
      offers.sort((a, b) => a.totalPrice - b.totalPrice);
      const topOffers = offers.slice(0, maxPerCity);

      return {
        cityNameEn: city.nameEn,
        cityNameKo: city.nameKo,
        iataCodes: city.iataCodes,
        offers: topOffers,
        cheapestPrice: topOffers[0]?.totalPrice,
      };
    });

    // Sort cities by cheapest price (cities with no offers go last)
    cityResults.sort((a, b) => {
      if (a.cheapestPrice == null && b.cheapestPrice == null) return 0;
      if (a.cheapestPrice == null) return 1;
      if (b.cheapestPrice == null) return -1;
      return a.cheapestPrice - b.cheapestPrice;
    });

    return {
      cities: cityResults,
      origin,
      departureDate,
      returnDate,
    };
  }

  private transformOffers(
    response: AmadeusFlightOffersResponse,
    params: {
      origin: string;
      destination: string;
      departureDate: string;
      returnDate?: string;
      adults?: number;
    },
  ): FlightOfferDto[] {
    const carriers = response.dictionaries?.carriers ?? {};

    return response.data.map((offer) => ({
      currency: offer.price.currency,
      totalPrice: parseFloat(offer.price.total),
      itineraries: offer.itineraries.map((itinerary) => ({
        duration: itinerary.duration,
        segments: itinerary.segments.map((segment) => ({
          departureAirport: segment.departure.iataCode,
          departureAt: segment.departure.at,
          departureTerminal: segment.departure.terminal,
          arrivalAirport: segment.arrival.iataCode,
          arrivalAt: segment.arrival.at,
          arrivalTerminal: segment.arrival.terminal,
          carrierCode: segment.carrierCode,
          carrierName: carriers[segment.carrierCode],
          flightNumber: segment.number,
          duration: segment.duration,
          numberOfStops: segment.numberOfStops,
        })),
      })),
      airlines: offer.validatingAirlineCodes,
      deeplink: this.deeplinkService.buildDeeplink({
        origin: params.origin,
        destination: params.destination,
        departureDate: params.departureDate,
        returnDate: params.returnDate,
        adults: params.adults,
      }),
    }));
  }
}
