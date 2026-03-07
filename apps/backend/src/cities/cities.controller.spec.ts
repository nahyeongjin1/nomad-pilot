import { Test, TestingModule } from '@nestjs/testing';
import { CitiesController } from './cities.controller.js';
import { CitiesService } from './cities.service.js';
import type { CityDto } from './dto/city.dto.js';

describe('CitiesController', () => {
  let controller: CitiesController;
  let citiesService: { findActive: jest.Mock };

  const mockCities: CityDto[] = [
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
    },
  ];

  beforeEach(async () => {
    citiesService = { findActive: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CitiesController],
      providers: [{ provide: CitiesService, useValue: citiesService }],
    }).compile();

    controller = module.get<CitiesController>(CitiesController);
  });

  describe('findAll', () => {
    it('should call citiesService.findActive and return result', async () => {
      citiesService.findActive.mockResolvedValue(mockCities);

      const result = await controller.findAll();

      expect(result).toBe(mockCities);
      expect(citiesService.findActive).toHaveBeenCalled();
    });
  });
});
