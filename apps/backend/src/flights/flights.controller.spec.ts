import { Test, TestingModule } from '@nestjs/testing';
import { FlightsController } from './flights.controller.js';
import { FlightsService } from './flights.service.js';
import type {
  FlightOfferDto,
  CheapestCitiesResponseDto,
} from './dto/flight-offer.dto.js';

describe('FlightsController', () => {
  let controller: FlightsController;
  let flightsService: { searchFlights: jest.Mock; cheapestCities: jest.Mock };

  const mockOffers: FlightOfferDto[] = [
    {
      currency: 'KRW',
      totalPrice: 250000,
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
});
