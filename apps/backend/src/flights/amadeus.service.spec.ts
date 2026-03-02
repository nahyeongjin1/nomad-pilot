import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  BadGatewayException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AxiosResponse, AxiosHeaders, AxiosError } from 'axios';
import { AmadeusService } from './amadeus.service.js';
import type {
  AmadeusFlightOffersResponse,
  AmadeusTokenResponse,
} from './interfaces/amadeus.interfaces.js';

function makeAxiosResponse<T>(data: T): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: new AxiosHeaders() },
  };
}

function makeAxiosError(status: number): AxiosError {
  const error = new AxiosError('Request failed');
  error.response = {
    status,
    statusText: 'Error',
    data: { errors: [{ status, code: 0, title: 'Error', detail: 'test' }] },
    headers: {},
    config: { headers: new AxiosHeaders() },
  };
  return error;
}

describe('AmadeusService', () => {
  let service: AmadeusService;
  let httpService: { post: jest.Mock; get: jest.Mock };
  let configService: { get: jest.Mock };

  const tokenResponse: AmadeusTokenResponse = {
    type: 'amadeusOAuth2Token',
    username: 'test',
    application_name: 'test',
    client_id: 'test_id',
    token_type: 'Bearer',
    access_token: 'test_token_123',
    expires_in: 1799,
    state: 'approved',
    scope: '',
  };

  const flightOffersResponse: AmadeusFlightOffersResponse = {
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
    dictionaries: {
      carriers: { KE: 'KOREAN AIR' },
    },
  };

  beforeEach(async () => {
    httpService = { post: jest.fn(), get: jest.fn() };
    configService = {
      get: jest.fn((key: string) => {
        const map: Record<string, string> = {
          AMADEUS_CLIENT_ID: 'test_id',
          AMADEUS_CLIENT_SECRET: 'test_secret',
          AMADEUS_BASE_URL: 'https://test.api.amadeus.com',
        };
        return map[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AmadeusService,
        { provide: HttpService, useValue: httpService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<AmadeusService>(AmadeusService);
    jest.clearAllMocks();
  });

  describe('searchFlightOffers', () => {
    it('should obtain token and search flights', async () => {
      httpService.post.mockReturnValue(of(makeAxiosResponse(tokenResponse)));
      httpService.get.mockReturnValue(
        of(makeAxiosResponse(flightOffersResponse)),
      );

      const result = await service.searchFlightOffers({
        origin: 'ICN',
        destination: 'NRT',
        departureDate: '2026-04-01',
        adults: 1,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0]!.price.total).toBe('250000');
      expect(result.dictionaries?.carriers?.KE).toBe('KOREAN AIR');

      // Token request
      expect(httpService.post).toHaveBeenCalledWith(
        'https://test.api.amadeus.com/v1/security/oauth2/token',
        expect.any(String),
        expect.objectContaining({
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );

      // Flight search request
      expect(httpService.get).toHaveBeenCalledWith(
        expect.stringContaining('/v2/shopping/flight-offers'),
        expect.objectContaining({
          headers: { Authorization: 'Bearer test_token_123' },
        }),
      );
    });

    it('should reuse existing valid token', async () => {
      httpService.post.mockReturnValue(of(makeAxiosResponse(tokenResponse)));
      httpService.get.mockReturnValue(
        of(makeAxiosResponse(flightOffersResponse)),
      );

      await service.searchFlightOffers({
        origin: 'ICN',
        destination: 'NRT',
        departureDate: '2026-04-01',
        adults: 1,
      });

      await service.searchFlightOffers({
        origin: 'ICN',
        destination: 'HND',
        departureDate: '2026-04-01',
        adults: 1,
      });

      // Token should be fetched only once
      expect(httpService.post).toHaveBeenCalledTimes(1);
      expect(httpService.get).toHaveBeenCalledTimes(2);
    });

    it('should include returnDate and nonStop params when provided', async () => {
      httpService.post.mockReturnValue(of(makeAxiosResponse(tokenResponse)));
      httpService.get.mockReturnValue(
        of(makeAxiosResponse(flightOffersResponse)),
      );

      await service.searchFlightOffers({
        origin: 'ICN',
        destination: 'NRT',
        departureDate: '2026-04-01',
        returnDate: '2026-04-07',
        adults: 2,
        nonStop: true,
        max: 3,
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const callUrl = httpService.get.mock.calls[0]![0] as string;
      expect(callUrl).toContain('returnDate=2026-04-07');
      expect(callUrl).toContain('adults=2');
      expect(callUrl).toContain('nonStop=true');
      expect(callUrl).toContain('max=3');
    });

    it('should retry once on 401 with refreshed token', async () => {
      const newTokenResponse = {
        ...tokenResponse,
        access_token: 'new_token_456',
      };
      httpService.post
        .mockReturnValueOnce(of(makeAxiosResponse(tokenResponse)))
        .mockReturnValueOnce(of(makeAxiosResponse(newTokenResponse)));

      httpService.get
        .mockReturnValueOnce(throwError(() => makeAxiosError(401)))
        .mockReturnValueOnce(of(makeAxiosResponse(flightOffersResponse)));

      const result = await service.searchFlightOffers({
        origin: 'ICN',
        destination: 'NRT',
        departureDate: '2026-04-01',
        adults: 1,
      });

      expect(result.data).toHaveLength(1);
      expect(httpService.post).toHaveBeenCalledTimes(2);
      expect(httpService.get).toHaveBeenCalledTimes(2);
    });

    it('should throw BadRequestException on 400', async () => {
      httpService.post.mockReturnValue(of(makeAxiosResponse(tokenResponse)));
      httpService.get.mockReturnValue(throwError(() => makeAxiosError(400)));

      await expect(
        service.searchFlightOffers({
          origin: 'INVALID',
          destination: 'NRT',
          departureDate: '2026-04-01',
          adults: 1,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadGatewayException on 5xx', async () => {
      httpService.post.mockReturnValue(of(makeAxiosResponse(tokenResponse)));
      httpService.get.mockReturnValue(throwError(() => makeAxiosError(500)));

      await expect(
        service.searchFlightOffers({
          origin: 'ICN',
          destination: 'NRT',
          departureDate: '2026-04-01',
          adults: 1,
        }),
      ).rejects.toThrow(BadGatewayException);
    });

    it('should map retry failure error after 401', async () => {
      const newTokenResponse = {
        ...tokenResponse,
        access_token: 'new_token_456',
      };
      httpService.post
        .mockReturnValueOnce(of(makeAxiosResponse(tokenResponse)))
        .mockReturnValueOnce(of(makeAxiosResponse(newTokenResponse)));

      httpService.get
        .mockReturnValueOnce(throwError(() => makeAxiosError(401)))
        .mockReturnValueOnce(throwError(() => makeAxiosError(500)));

      await expect(
        service.searchFlightOffers({
          origin: 'ICN',
          destination: 'NRT',
          departureDate: '2026-04-01',
          adults: 1,
        }),
      ).rejects.toThrow(BadGatewayException);
    });

    it('should throw on missing credentials in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        const emptyConfigService = {
          get: jest.fn(() => undefined),
        };

        expect(
          () =>
            new AmadeusService(
              httpService as unknown as HttpService,
              emptyConfigService as unknown as ConfigService,
            ),
        ).toThrow(
          'AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET must be configured',
        );
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should throw ServiceUnavailableException on 429', async () => {
      httpService.post.mockReturnValue(of(makeAxiosResponse(tokenResponse)));
      httpService.get.mockReturnValue(throwError(() => makeAxiosError(429)));

      await expect(
        service.searchFlightOffers({
          origin: 'ICN',
          destination: 'NRT',
          departureDate: '2026-04-01',
          adults: 1,
        }),
      ).rejects.toThrow(ServiceUnavailableException);
    });
  });
});
