import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Poi } from './entities/poi.entity.js';

@Injectable()
export class PoisService {
  constructor(
    @InjectRepository(Poi) private readonly poiRepo: Repository<Poi>,
  ) {}

  /**
   * Store a Google Place ID for the given POI (idempotent).
   * Only writes if googlePlaceId is currently null.
   * Returns true if updated, false if already had a value.
   */
  async patchGooglePlaceId(
    id: string,
    googlePlaceId: string,
  ): Promise<boolean> {
    const result = await this.poiRepo.update(
      { id, googlePlaceId: null as unknown as string },
      { googlePlaceId },
    );

    if (result.affected === 0) {
      // Either POI doesn't exist or already has a googlePlaceId
      const exists = await this.poiRepo.existsBy({ id });
      if (!exists) {
        throw new NotFoundException(`POI ${id} not found`);
      }
      return false; // Already had a value
    }

    return true;
  }
}
