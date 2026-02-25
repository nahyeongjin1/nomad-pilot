import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  Unique,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { Trip } from './trip.entity.js';
import { TripDayPoi } from './trip-day-poi.entity.js';

@Entity('trip_days')
@Unique(['tripId', 'dayNumber'])
export class TripDay extends BaseEntity {
  @ManyToOne(() => Trip, (trip) => trip.tripDays, { onDelete: 'CASCADE' })
  @JoinColumn()
  trip!: Trip;

  @Column({ type: 'uuid' })
  tripId!: string;

  @Column({ type: 'smallint' })
  dayNumber!: number;

  @Column({ type: 'date', nullable: true })
  date!: string | null;

  @Column({ type: 'text', nullable: true })
  memo!: string | null;

  @OneToMany(() => TripDayPoi, (tdp) => tdp.tripDay)
  tripDayPois!: TripDayPoi[];
}
