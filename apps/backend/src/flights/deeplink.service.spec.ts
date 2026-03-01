import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DeeplinkService } from './deeplink.service.js';

describe('DeeplinkService', () => {
  let service: DeeplinkService;
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    configService = { get: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeeplinkService,
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<DeeplinkService>(DeeplinkService);
    jest.clearAllMocks();
  });

  describe('buildSearchUrl', () => {
    it('should build a one-way Aviasales search URL', () => {
      const url = service.buildSearchUrl({
        origin: 'ICN',
        destination: 'NRT',
        departureDate: '2026-04-01',
        adults: 1,
      });

      expect(url).toContain('https://search.aviasales.com/flights/');
      expect(url).toContain('origin_iata=ICN');
      expect(url).toContain('destination_iata=NRT');
      expect(url).toContain('depart_date=2026-04-01');
      expect(url).toContain('one_way=true');
      expect(url).toContain('adults=1');
      expect(url).not.toContain('return_date');
    });

    it('should build a round-trip Aviasales search URL', () => {
      const url = service.buildSearchUrl({
        origin: 'ICN',
        destination: 'KIX',
        departureDate: '2026-04-01',
        returnDate: '2026-04-07',
        adults: 2,
      });

      expect(url).toContain('origin_iata=ICN');
      expect(url).toContain('destination_iata=KIX');
      expect(url).toContain('depart_date=2026-04-01');
      expect(url).toContain('return_date=2026-04-07');
      expect(url).toContain('one_way=false');
      expect(url).toContain('adults=2');
    });
  });

  describe('buildDeeplink', () => {
    it('should wrap with Travelpayouts when marker is set', () => {
      configService.get.mockReturnValue('12345');

      const deeplink = service.buildDeeplink({
        origin: 'ICN',
        destination: 'NRT',
        departureDate: '2026-04-01',
        adults: 1,
      });

      expect(deeplink).toContain('https://tp.media/r?');
      expect(deeplink).toContain('marker=12345');
      expect(deeplink).toContain('p=4114');
      expect(deeplink).toContain('u=');
      expect(deeplink).toContain(encodeURIComponent('search.aviasales.com'));
    });

    it('should return raw Aviasales URL when marker is not set', () => {
      configService.get.mockReturnValue(undefined);

      const deeplink = service.buildDeeplink({
        origin: 'ICN',
        destination: 'NRT',
        departureDate: '2026-04-01',
        adults: 1,
      });

      expect(deeplink).toContain('https://search.aviasales.com/flights/');
      expect(deeplink).not.toContain('tp.media');
    });

    it('should return raw Aviasales URL when marker is empty string', () => {
      configService.get.mockReturnValue('');

      const deeplink = service.buildDeeplink({
        origin: 'ICN',
        destination: 'NRT',
        departureDate: '2026-04-01',
        adults: 1,
      });

      expect(deeplink).toContain('https://search.aviasales.com/flights/');
      expect(deeplink).not.toContain('tp.media');
    });
  });
});
