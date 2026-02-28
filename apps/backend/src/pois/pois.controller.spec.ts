import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PoisController } from './pois.controller.js';
import { PoisService } from './pois.service.js';

describe('PoisController', () => {
  let controller: PoisController;

  const mockPoisService = {
    patchGooglePlaceId: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PoisController],
      providers: [{ provide: PoisService, useValue: mockPoisService }],
    }).compile();

    controller = module.get<PoisController>(PoisController);
    jest.clearAllMocks();
  });

  describe('patchGooglePlaceId', () => {
    const poiId = '123e4567-e89b-12d3-a456-426614174000';
    const dto = { googlePlaceId: 'ChIJN1t_tDeuEmsRUsoyG83frY4' };

    it('should call service and return void on success', async () => {
      mockPoisService.patchGooglePlaceId.mockResolvedValue(true);

      const result = await controller.patchGooglePlaceId(poiId, dto);

      expect(result).toBeUndefined();
      expect(mockPoisService.patchGooglePlaceId).toHaveBeenCalledWith(
        poiId,
        dto.googlePlaceId,
      );
    });

    it('should propagate NotFoundException from service', async () => {
      mockPoisService.patchGooglePlaceId.mockRejectedValue(
        new NotFoundException(),
      );

      await expect(controller.patchGooglePlaceId(poiId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
