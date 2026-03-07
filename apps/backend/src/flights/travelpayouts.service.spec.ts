import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { TravelpayoutsService } from './travelpayouts.service.js';

describe('TravelpayoutsService', () => {
  let service: TravelpayoutsService;
  let httpService: { get: jest.Mock };

  beforeEach(async () => {
    httpService = { get: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TravelpayoutsService,
        { provide: HttpService, useValue: httpService },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('test-token') },
        },
      ],
    }).compile();

    service = module.get<TravelpayoutsService>(TravelpayoutsService);
  });

  describe('getLatestPrices', () => {
    it('should return transformed prices on success', async () => {
      httpService.get.mockReturnValue(
        of({
          data: {
            success: true,
            currency: 'krw',
            data: [
              {
                origin: 'ICN',
                destination: 'NRT',
                value: 150000,
                gate: 'Aviasales',
                depart_date: '2026-04-01T10:00:00+09:00',
                return_date: '2026-04-07T15:00:00+09:00',
                number_of_changes: 0,
                found_at: '2026-03-31T00:00:00Z',
                distance: 1200,
                trip_class: 0,
                duration: 150,
                actual: true,
                show_to_affiliates: true,
              },
            ],
          },
        }),
      );

      const result = await service.getLatestPrices('ICN');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        origin: 'ICN',
        destination: 'NRT',
        price: 150000,
        gate: 'Aviasales',
        departDate: '2026-04-01',
        returnDate: '2026-04-07',
        numberOfChanges: 0,
      });
    });

    it('should return empty array on API error', async () => {
      httpService.get.mockReturnValue(
        throwError(() => new Error('Network error')),
      );

      const result = await service.getLatestPrices('ICN');

      expect(result).toEqual([]);
    });

    it('should return empty array when success=false', async () => {
      httpService.get.mockReturnValue(
        of({ data: { success: false, data: [] } }),
      );

      const result = await service.getLatestPrices('ICN');

      expect(result).toEqual([]);
    });
  });

  describe('when token is not configured', () => {
    it('should return empty array without making API call', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          TravelpayoutsService,
          { provide: HttpService, useValue: httpService },
          {
            provide: ConfigService,
            useValue: { get: jest.fn().mockReturnValue('') },
          },
        ],
      }).compile();

      const noTokenService =
        module.get<TravelpayoutsService>(TravelpayoutsService);
      const result = await noTokenService.getLatestPrices('ICN');

      expect(result).toEqual([]);
      expect(httpService.get).not.toHaveBeenCalled();
    });
  });
});
