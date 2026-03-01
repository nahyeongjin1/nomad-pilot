import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FlightsService } from './flights.service.js';
import { AmadeusService } from './amadeus.service.js';
import { DeeplinkService } from './deeplink.service.js';
import { City } from '../cities/entities/city.entity.js';
import type { AmadeusFlightOffersResponse } from './interfaces/amadeus.interfaces.js';

describe('FlightsService', () => {
  let service: FlightsService;
  let amadeusService: { searchFlightOffers: jest.Mock };
  let deeplinkService: { buildDeeplink: jest.Mock };
  let cacheManager: { get: jest.Mock; set: jest.Mock };
  let cityRepo: { find: jest.Mock };

  const mockAmadeusResponse: AmadeusFlightOffersResponse = {
    meta: { count: 1 },
    data: [
      {
        type: 'flight-offer',
        id: '1',
        source: 'GDS',
        instantTicketingRequired: false,
        nonHomogeneous: false,
        oneWay: false,
        lastTicketingDate: '2026-04-01',
        numberOfBookableSeats: 9,
        itineraries: [
          {
            duration: 'PT2H30M',
            segments: [
              {
                departure: {
                  iataCode: 'ICN',
                  terminal: '1',
                  at: '2026-04-01T10:00:00',
                },
                arrival: {
                  iataCode: 'NRT',
                  terminal: '1',
                  at: '2026-04-01T13:30:00',
                },
                carrierCode: 'KE',
                number: '713',
                aircraft: { code: '789' },
                duration: 'PT2H30M',
                id: '1',
                numberOfStops: 0,
                blacklistedInEU: false,
              },
            ],
          },
        ],
        price: {
          currency: 'KRW',
          total: '250000',
          base: '200000',
          grandTotal: '250000',
        },
        pricingOptions: {
          fareType: ['PUBLISHED'],
          includedCheckedBagsOnly: true,
        },
        validatingAirlineCodes: ['KE'],
        travelerPricings: [
          {
            travelerId: '1',
            fareOption: 'STANDARD',
            travelerType: 'ADULT',
            price: { currency: 'KRW', total: '250000', base: '200000' },
            fareDetailsBySegment: [
              {
                segmentId: '1',
                cabin: 'ECONOMY',
                fareBasis: 'YOWKR',
                class: 'Y',
                includedCheckedBags: { weight: 23, weightUnit: 'KG' },
              },
            ],
          },
        ],
      },
    ],
    dictionaries: { carriers: { KE: 'KOREAN AIR' } },
  };

  beforeEach(async () => {
    amadeusService = { searchFlightOffers: jest.fn() };
    deeplinkService = { buildDeeplink: jest.fn() };
    cacheManager = { get: jest.fn(), set: jest.fn() };
    cityRepo = { find: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FlightsService,
        { provide: AmadeusService, useValue: amadeusService },
        { provide: DeeplinkService, useValue: deeplinkService },
        { provide: CACHE_MANAGER, useValue: cacheManager },
        { provide: getRepositoryToken(City), useValue: cityRepo },
      ],
    }).compile();

    service = module.get<FlightsService>(FlightsService);
    jest.clearAllMocks();
  });

  describe('searchFlights', () => {
    it('should return cached result on cache hit', async () => {
      const cached = [{ currency: 'KRW', totalPrice: 250000 }];
      cacheManager.get.mockResolvedValue(cached);

      const result = await service.searchFlights({
        origin: 'ICN',
        destination: 'NRT',
        departureDate: '2026-04-01',
      });

      expect(result).toBe(cached);
      expect(amadeusService.searchFlightOffers).not.toHaveBeenCalled();
    });

    it('should call Amadeus and cache on cache miss', async () => {
      cacheManager.get.mockResolvedValue(undefined);
      amadeusService.searchFlightOffers.mockResolvedValue(mockAmadeusResponse);
      deeplinkService.buildDeeplink.mockReturnValue(
        'https://example.com/deeplink',
      );

      const result = await service.searchFlights({
        origin: 'ICN',
        destination: 'NRT',
        departureDate: '2026-04-01',
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        currency: 'KRW',
        totalPrice: 250000,
        deeplink: 'https://example.com/deeplink',
      });
      expect(result[0]!.itineraries[0]!.segments[0]).toMatchObject({
        departureAirport: 'ICN',
        arrivalAirport: 'NRT',
        carrierCode: 'KE',
        carrierName: 'KOREAN AIR',
      });
      expect(cacheManager.set).toHaveBeenCalledWith(
        expect.stringContaining('flights:'),
        result,
        15 * 60 * 1000,
      );
    });

    it('should generate correct cache key', async () => {
      cacheManager.get.mockResolvedValue(undefined);
      amadeusService.searchFlightOffers.mockResolvedValue(mockAmadeusResponse);
      deeplinkService.buildDeeplink.mockReturnValue('https://example.com');

      await service.searchFlights({
        origin: 'ICN',
        destination: 'NRT',
        departureDate: '2026-04-01',
        returnDate: '2026-04-07',
        adults: 2,
        nonStop: true,
      });

      expect(cacheManager.get).toHaveBeenCalledWith(
        'flights:ICN:NRT:2026-04-01:2026-04-07:2:true:5',
      );
    });
  });

  describe('cheapestCities', () => {
    const mockCities = [
      {
        id: '1',
        nameEn: 'Tokyo',
        nameKo: '도쿄',
        iataCodes: ['NRT', 'HND'],
        countryCode: 'JP',
        isActive: true,
      },
      {
        id: '2',
        nameEn: 'Osaka',
        nameKo: '오사카',
        iataCodes: ['KIX'],
        countryCode: 'JP',
        isActive: true,
      },
    ];

    it('should search all cities in parallel and sort by cheapest price', async () => {
      cityRepo.find.mockResolvedValue(mockCities);
      cacheManager.get.mockResolvedValue(undefined);
      deeplinkService.buildDeeplink.mockReturnValue('https://example.com');

      const expensiveResponse: AmadeusFlightOffersResponse = {
        ...mockAmadeusResponse,
        data: [
          {
            ...mockAmadeusResponse.data[0]!,
            price: {
              ...mockAmadeusResponse.data[0]!.price,
              total: '400000',
              grandTotal: '400000',
            },
          },
        ],
      };

      // NRT → 400000, HND → 400000, KIX → 250000
      amadeusService.searchFlightOffers
        .mockResolvedValueOnce(expensiveResponse)
        .mockResolvedValueOnce(expensiveResponse)
        .mockResolvedValueOnce(mockAmadeusResponse);

      const result = await service.cheapestCities({
        departureDate: '2026-04-01',
      });

      expect(result.cities).toHaveLength(2);
      // Osaka (KIX 250000) should be first (cheapest)
      expect(result.cities[0]!.cityNameEn).toBe('Osaka');
      expect(result.cities[0]!.cheapestPrice).toBe(250000);
      // Tokyo (NRT/HND 400000) should be second
      expect(result.cities[1]!.cityNameEn).toBe('Tokyo');
    });

    it('should use Promise.allSettled so partial failures still return results', async () => {
      cityRepo.find.mockResolvedValue(mockCities);
      cacheManager.get.mockResolvedValue(undefined);
      deeplinkService.buildDeeplink.mockReturnValue('https://example.com');

      // NRT fails, HND fails, KIX succeeds
      amadeusService.searchFlightOffers
        .mockRejectedValueOnce(new Error('API error'))
        .mockRejectedValueOnce(new Error('API error'))
        .mockResolvedValueOnce(mockAmadeusResponse);

      const result = await service.cheapestCities({
        departureDate: '2026-04-01',
      });

      // Tokyo has no offers (both airports failed), Osaka has offers
      expect(result.cities).toHaveLength(2);
      const osaka = result.cities.find((c) => c.cityNameEn === 'Osaka');
      const tokyo = result.cities.find((c) => c.cityNameEn === 'Tokyo');
      expect(osaka!.offers).toHaveLength(1);
      expect(tokyo!.offers).toHaveLength(0);
    });

    it('should default origin to ICN', async () => {
      cityRepo.find.mockResolvedValue([]);

      const result = await service.cheapestCities({
        departureDate: '2026-04-01',
      });

      expect(result.origin).toBe('ICN');
    });
  });
});
