import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import type { Point } from 'geojson';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { City } from '../../cities/entities/city.entity.js';
import { PoiCategory, PoiSource } from '../../common/enums/index.js';
import { TripDayPoi } from '../../trips/entities/trip-day-poi.entity.js';

@Entity('pois')
@Check(
  'CHK_pois_rating',
  '"rating" IS NULL OR ("rating" >= 0 AND "rating" <= 5)',
)
@Check(
  'CHK_pois_price_level',
  '"price_level" IS NULL OR ("price_level" BETWEEN 1 AND 4)',
)
@Index('UQ_pois_source_source_id', ['source', 'sourceId'], {
  unique: true,
  where: '"source_id" IS NOT NULL',
})
export class Poi extends BaseEntity {
  @ManyToOne(() => City, (city) => city.pois, { onDelete: 'RESTRICT' })
  @JoinColumn()
  city!: City;

  @Index()
  @Column({ type: 'uuid' })
  cityId!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  nameLocal!: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  locale!: string | null;

  @Index({ spatial: true })
  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  location!: Point;

  @Index()
  @Column({ type: 'enum', enum: PoiCategory })
  category!: PoiCategory;

  @Column({ type: 'varchar', length: 100, nullable: true })
  subCategory!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'text', nullable: true })
  descriptionLocal!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  address!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  addressLocal!: string | null;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  rating!: string | null;

  @Column({ type: 'smallint', nullable: true })
  priceLevel!: number | null;

  @Column({ type: 'jsonb', nullable: true })
  openingHours!: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  imageUrl!: string | null;

  @Index()
  @Column({ type: 'enum', enum: PoiSource })
  source!: PoiSource;

  @Column({ type: 'varchar', length: 255, nullable: true })
  sourceId!: string | null;

  @Column({ type: 'text', array: true, default: '{}' })
  tags!: string[];

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Index('IDX_pois_search_vector', { synchronize: false })
  @Column({ type: 'tsvector', nullable: true, select: false })
  searchVector!: string | null;

  @OneToMany(() => TripDayPoi, (tdp) => tdp.poi)
  tripDayPois!: TripDayPoi[];
}
