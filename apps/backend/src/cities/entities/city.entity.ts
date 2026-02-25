import { Column, Entity, Index, OneToMany } from 'typeorm';
import type { Point } from 'geojson';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { Poi } from '../../pois/entities/poi.entity.js';
import { Trip } from '../../trips/entities/trip.entity.js';

@Entity('cities')
export class City extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  nameKo!: string;

  @Column({ type: 'varchar', length: 100 })
  nameEn!: string;

  @Column({ type: 'varchar', length: 100 })
  nameLocal!: string;

  @Index()
  @Column({ type: 'char', length: 2 })
  countryCode!: string;

  @Index({ spatial: true })
  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  location!: Point;

  @Column({ type: 'varchar', length: 50 })
  timezone!: string;

  @Column({ type: 'text', array: true })
  iataCodes!: string[];

  @Column({ type: 'char', length: 3 })
  currencyCode!: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @OneToMany(() => Poi, (poi) => poi.city)
  pois!: Poi[];

  @OneToMany(() => Trip, (trip) => trip.city)
  trips!: Trip[];
}
