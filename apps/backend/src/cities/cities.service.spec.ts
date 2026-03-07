import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CitiesService } from './cities.service.js';
import { City } from './entities/city.entity.js';

describe('CitiesService', () => {
  let service: CitiesService;
  let cityRepo: { find: jest.Mock };

  beforeEach(async () => {
    cityRepo = { find: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CitiesService,
        { provide: getRepositoryToken(City), useValue: cityRepo },
      ],
    }).compile();

    service = module.get<CitiesService>(CitiesService);
  });

  describe('findActive', () => {
    it('should return mapped CityDto array', async () => {
      cityRepo.find.mockResolvedValue([
        {
          id: '1',
          nameKo: '도쿄',
          nameEn: 'Tokyo',
          nameLocal: '東京',
          countryCode: 'JP',
          imageUrl: 'https://images.unsplash.com/photo-xxx',
          imageAuthorName: 'John',
          imageAuthorUrl: 'https://unsplash.com/@john',
          iataCodes: ['NRT', 'HND'],
          timezone: 'Asia/Tokyo',
          currencyCode: 'JPY',
          isActive: true,
        },
      ]);

      const result = await service.findActive();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: '1',
        nameKo: '도쿄',
        nameEn: 'Tokyo',
        nameLocal: '東京',
        countryCode: 'JP',
        imageUrl: 'https://images.unsplash.com/photo-xxx',
        imageAuthorName: 'John',
        imageAuthorUrl: 'https://unsplash.com/@john',
        iataCodes: ['NRT', 'HND'],
      });
      // Should not include timezone, currencyCode
      expect(result[0]).not.toHaveProperty('timezone');
      expect(result[0]).not.toHaveProperty('currencyCode');
    });

    it('should query with isActive=true and order by nameKo', async () => {
      cityRepo.find.mockResolvedValue([]);

      await service.findActive();

      expect(cityRepo.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { nameKo: 'ASC' },
      });
    });
  });
});
