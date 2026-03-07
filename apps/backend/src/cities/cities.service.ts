import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { City } from './entities/city.entity.js';
import type { CityDto } from './dto/city.dto.js';

@Injectable()
export class CitiesService {
  constructor(
    @InjectRepository(City)
    private readonly cityRepository: Repository<City>,
  ) {}

  async findActive(): Promise<CityDto[]> {
    const cities = await this.cityRepository.find({
      where: { isActive: true },
      order: { nameKo: 'ASC' },
    });

    return cities.map((city) => ({
      id: city.id,
      nameKo: city.nameKo,
      nameEn: city.nameEn,
      nameLocal: city.nameLocal,
      countryCode: city.countryCode,
      imageUrl: city.imageUrl,
      imageAuthorName: city.imageAuthorName,
      imageAuthorUrl: city.imageAuthorUrl,
      iataCodes: city.iataCodes,
    }));
  }
}
