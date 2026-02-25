import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { TripDay } from './trip-day.entity.js';
import { Poi } from '../../pois/entities/poi.entity.js';

@Entity('trip_day_pois')
@Unique(['tripDayId', 'visitOrder'])
export class TripDayPoi extends BaseEntity {
  @ManyToOne(() => TripDay, (td) => td.tripDayPois, { onDelete: 'CASCADE' })
  @JoinColumn()
  tripDay!: TripDay;

  @Column({ type: 'uuid' })
  tripDayId!: string;

  @ManyToOne(() => Poi, (poi) => poi.tripDayPois, { onDelete: 'RESTRICT' })
  @JoinColumn()
  poi!: Poi;

  @Index()
  @Column({ type: 'uuid' })
  poiId!: string;

  @Column({ type: 'smallint' })
  visitOrder!: number;

  @Column({ type: 'time', nullable: true })
  plannedArrival!: string | null;

  @Column({ type: 'time', nullable: true })
  plannedDeparture!: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  estimatedCostLocal!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;
}
