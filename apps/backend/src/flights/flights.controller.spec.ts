import { Test, TestingModule } from '@nestjs/testing';
import { FlightsController } from './flights.controller.js';
import { FlightsService } from './flights.service.js';
import type {
  FlightOfferDto,
  CheapestCitiesResponseDto,
} from './dto/flight-offer.dto.js';
import type { LowestPricesResponseDto } from './dto/lowest-price.dto.js';

describe('FlightsController', () => {
  let controller: FlightsController;
  let flightsService: {
    searchFlights: jest.Mock;
    cheapestCities: jest.Mock;
    flexibleSearch: jest.Mock;
    lowestPrices: jest.Mock;
  };

  const mockOffers: FlightOfferDto[] = [
    {
      currency: 'KRW',
      totalPrice: 250000,
      originAirport: 'ICN',
      destinationAirport: 'NRT',
      nightsInDest: null,
      itineraries: [
        {
          duration: 'PT2H30M',
          segments: [
            {
              departureAirport: 'ICN',
              departureAt: '2026-04-01T10:00:00',
              arrivalAirport: 'NRT',
              arrivalAt: '2026-04-01T13:30:00',
              carrierCode: 'KE',
              carrierName: 'KOREAN AIR',
              flightNumber: '713',
              duration: 'PT2H30M',
              numberOfStops: 0,
            },
          ],
        },
      ],
      airlines: ['KE'],
      deeplink: 'https://example.com/deeplink',
    },
  ];

  const mockCheapestCitiesResponse: CheapestCitiesResponseDto = {
    cities: [
      {
        cityNameEn: 'Tokyo',
        cityNameKo: '도쿄',
        iataCodes: ['NRT', 'HND'],
        offers: mockOffers,
        cheapestPrice: 250000,
      },
    ],
    origin: 'ICN',
    departureDate: '2026-04-01',
  };

  beforeEach(async () => {
    flightsService = {
      searchFlights: jest.fn(),
      cheapestCities: jest.fn(),
      flexibleSearch: jest.fn(),
      lowestPrices: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FlightsController],
      providers: [{ provide: FlightsService, useValue: flightsService }],
    }).compile();

    controller = module.get<FlightsController>(FlightsController);
    jest.clearAllMocks();
  });

  describe('search', () => {
    it('should call flightsService.searchFlights and return result', async () => {
      flightsService.searchFlights.mockResolvedValue(mockOffers);

      const result = await controller.search({
        origin: 'ICN',
        destination: 'NRT',
        departureDate: '2026-04-01',
      });

      expect(result).toBe(mockOffers);
      expect(flightsService.searchFlights).toHaveBeenCalledWith({
        origin: 'ICN',
        destination: 'NRT',
        departureDate: '2026-04-01',
        returnDate: undefined,
        adults: 1,
        nonStop: false,
        max: 5,
      });
    });
  });

  describe('cheapestCities', () => {
    it('should call flightsService.cheapestCities and return result', async () => {
      flightsService.cheapestCities.mockResolvedValue(
        mockCheapestCitiesResponse,
      );

      const result = await controller.cheapestCities({
        departureDate: '2026-04-01',
      });

      expect(result).toBe(mockCheapestCitiesResponse);
      expect(flightsService.cheapestCities).toHaveBeenCalledWith({
        origin: 'ICN',
        departureDate: '2026-04-01',
        returnDate: undefined,
        adults: 1,
        maxPerCity: 3,
      });
    });
  });

  describe('flexibleSearch', () => {
    it('should parse origins and call flightsService.flexibleSearch', async () => {
      flightsService.flexibleSearch.mockResolvedValue(mockOffers);

      const result = await controller.flexibleSearch({
        origins: 'ICN,GMP',
        destination: 'city-1',
        dateFrom: '2026-03-13',
        dateTo: '2026-03-14',
        nightsFrom: 2,
        nightsTo: 3,
      });

      expect(result).toBe(mockOffers);
      expect(flightsService.flexibleSearch).toHaveBeenCalledWith({
        origins: ['ICN', 'GMP'],
        destinationCityId: 'city-1',
        dateFrom: '2026-03-13',
        dateTo: '2026-03-14',
        nightsFrom: 2,
        nightsTo: 3,
        adults: 1,
        maxResults: 20,
      });
    });

    it('should default origins to ICN,GMP when not provided', async () => {
      flightsService.flexibleSearch.mockResolvedValue([]);

      await controller.flexibleSearch({
        destination: 'city-1',
        dateFrom: '2026-03-13',
        dateTo: '2026-03-14',
        nightsFrom: 1,
        nightsTo: 2,
      });

      expect(flightsService.flexibleSearch).toHaveBeenCalledWith(
        expect.objectContaining({ origins: ['ICN', 'GMP'] }),
      );
    });
  });

  describe('lowestPrices', () => {
    it('should call flightsService.lowestPrices and return result', async () => {
      const mockResponse: LowestPricesResponseDto = {
        cities: [
          {
            cityId: '1',
            cityNameKo: '도쿄',
            cityNameEn: 'Tokyo',
            lowestPrice: 150000,
            currency: 'KRW',
            gate: 'Aviasales',
            originAirport: 'ICN',
            departDate: '2026-04-01',
            returnDate: '2026-04-07',
          },
        ],
        origins: ['ICN', 'GMP'],
        cachedAt: '2026-03-07T12:00:00.000Z',
      };
      flightsService.lowestPrices.mockResolvedValue(mockResponse);

      const result = await controller.lowestPrices();

      expect(result).toBe(mockResponse);
      expect(flightsService.lowestPrices).toHaveBeenCalled();
    });
  });
});
