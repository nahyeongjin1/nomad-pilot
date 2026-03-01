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

  describe('buildDeeplink', () => {
    it('should wrap one-way search URL with tp.media tracker when marker is set', () => {
      configService.get.mockReturnValue('707165');

      const deeplink = service.buildDeeplink({
        origin: 'ICN',
        destination: 'NRT',
        departureDate: '2026-04-01',
        adults: 1,
      });

      expect(deeplink).toContain('https://tp.media/r?');
      expect(deeplink).toContain('marker=707165');
      expect(deeplink).toContain('p=4114');
      // Target URL uses compact params: ICN0104NRT1
      expect(deeplink).toContain(
        encodeURIComponent('https://www.aviasales.com/?params=ICN0104NRT1'),
      );
    });

    it('should include return date in compact params for round-trip', () => {
      configService.get.mockReturnValue('707165');

      const deeplink = service.buildDeeplink({
        origin: 'ICN',
        destination: 'KIX',
        departureDate: '2026-04-01',
        returnDate: '2026-04-07',
        adults: 2,
      });

      // ICN0104KIX07042
      expect(deeplink).toContain(
        encodeURIComponent('https://www.aviasales.com/?params=ICN0104KIX07042'),
      );
    });

    it('should return raw Aviasales URL when marker is not set', () => {
      configService.get.mockReturnValue(undefined);

      const deeplink = service.buildDeeplink({
        origin: 'ICN',
        destination: 'NRT',
        departureDate: '2026-04-01',
        adults: 1,
      });

      expect(deeplink).toBe('https://www.aviasales.com/?params=ICN0104NRT1');
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

      expect(deeplink).toBe('https://www.aviasales.com/?params=ICN0104NRT1');
      expect(deeplink).not.toContain('tp.media');
    });
  });
});
