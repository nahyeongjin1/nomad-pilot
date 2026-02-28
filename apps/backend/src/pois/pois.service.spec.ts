import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { PoisService } from './pois.service.js';
import { Poi } from './entities/poi.entity.js';

describe('PoisService', () => {
  let service: PoisService;

  const mockPoiRepo = {
    update: jest.fn(),
    existsBy: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PoisService,
        { provide: getRepositoryToken(Poi), useValue: mockPoiRepo },
      ],
    }).compile();

    service = module.get<PoisService>(PoisService);
    jest.clearAllMocks();
  });

  describe('patchGooglePlaceId', () => {
    const poiId = '123e4567-e89b-12d3-a456-426614174000';
    const placeId = 'ChIJN1t_tDeuEmsRUsoyG83frY4';

    it('should store place_id when POI has no existing value', async () => {
      mockPoiRepo.update.mockResolvedValue({ affected: 1 });

      const result = await service.patchGooglePlaceId(poiId, placeId);

      expect(result).toBe(true);
      expect(mockPoiRepo.update).toHaveBeenCalledWith(
        { id: poiId, googlePlaceId: null },
        { googlePlaceId: placeId },
      );
    });

    it('should return false when POI already has a place_id', async () => {
      mockPoiRepo.update.mockResolvedValue({ affected: 0 });
      mockPoiRepo.existsBy.mockResolvedValue(true);

      const result = await service.patchGooglePlaceId(poiId, placeId);

      expect(result).toBe(false);
    });

    it('should throw NotFoundException when POI does not exist', async () => {
      mockPoiRepo.update.mockResolvedValue({ affected: 0 });
      mockPoiRepo.existsBy.mockResolvedValue(false);

      await expect(service.patchGooglePlaceId(poiId, placeId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
