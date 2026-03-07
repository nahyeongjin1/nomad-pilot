import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Cache } from 'cache-manager';
import { AmadeusService } from './amadeus.service.js';
import { DeeplinkService } from './deeplink.service.js';
import { TravelpayoutsService } from './travelpayouts.service.js';
import { City } from '../cities/entities/city.entity.js';
import type { AmadeusFlightOffersResponse } from './interfaces/amadeus.interfaces.js';
import type { TravelpayoutsPrice } from './interfaces/travelpayouts.interfaces.js';
import type {
  FlightOfferDto,
  CityFlightsDto,
  CheapestCitiesResponseDto,
} from './dto/flight-offer.dto.js';
import type {
  CityLowestPriceDto,
  LowestPricesResponseDto,
} from './dto/lowest-price.dto.js';

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const LOWEST_PRICES_CACHE_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours

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
    private readonly travelpayoutsService: TravelpayoutsService,
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

  async lowestPrices(): Promise<LowestPricesResponseDto> {
    const origins = ['ICN', 'GMP'];
    const cacheKey = `lowest-prices:${[...origins].sort().join(',')}`;

    const cached =
      await this.cacheManager.get<LowestPricesResponseDto>(cacheKey);
    if (cached) {
      return cached;
    }

    const [cities, ...priceArrays] = await Promise.all([
      this.cityRepository.find({ where: { isActive: true } }),
      ...origins.map((origin) =>
        this.travelpayoutsService
          .getLatestPrices(origin)
          .catch((err: unknown) => {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.warn(
              `Failed to fetch prices for origin ${origin}: ${message}`,
            );
            return [] as TravelpayoutsPrice[];
          }),
      ),
    ]);

    const allPrices = priceArrays.flat();

    // Build destination → city mapping (iataCityCode + iataCodes for fallback)
    const destToCities = new Map<string, City[]>();
    for (const city of cities) {
      if (city.iataCityCode) {
        const list = destToCities.get(city.iataCityCode) ?? [];
        list.push(city);
        destToCities.set(city.iataCityCode, list);
      }
      for (const iata of city.iataCodes) {
        const list = destToCities.get(iata) ?? [];
        list.push(city);
        destToCities.set(iata, list);
      }
    }

    // Find lowest price per city
    const cityBestPrice = new Map<
      string,
      { price: TravelpayoutsPrice; origin: string }
    >();

    for (const price of allPrices) {
      const matchedCities = destToCities.get(price.destination);
      if (!matchedCities) continue;

      for (const city of matchedCities) {
        const current = cityBestPrice.get(city.id);
        if (!current || price.price < current.price.price) {
          cityBestPrice.set(city.id, { price, origin: price.origin });
        }
      }
    }

    const cityDtos: CityLowestPriceDto[] = cities.map((city) => {
      const best = cityBestPrice.get(city.id);
      return {
        cityId: city.id,
        cityNameKo: city.nameKo,
        cityNameEn: city.nameEn,
        lowestPrice: best?.price.price ?? null,
        currency: 'KRW',
        gate: best?.price.gate ?? null,
        originAirport: best?.origin ?? null,
        departDate: best?.price.departDate ?? null,
        returnDate: best?.price.returnDate ?? null,
      };
    });

    // Sort by price (null last)
    cityDtos.sort((a, b) => {
      if (a.lowestPrice == null && b.lowestPrice == null) return 0;
      if (a.lowestPrice == null) return 1;
      if (b.lowestPrice == null) return -1;
      return a.lowestPrice - b.lowestPrice;
    });

    const result: LowestPricesResponseDto = {
      cities: cityDtos,
      origins,
      cachedAt: new Date().toISOString(),
    };

    await this.cacheManager.set(cacheKey, result, LOWEST_PRICES_CACHE_TTL_MS);

    return result;
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
