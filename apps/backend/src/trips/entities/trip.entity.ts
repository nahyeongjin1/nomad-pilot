import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { TripStatus } from '../../common/enums/index.js';
import { User } from '../../users/entities/user.entity.js';
import { City } from '../../cities/entities/city.entity.js';
import { BudgetAllocation } from './budget-allocation.entity.js';
import { TripDay } from './trip-day.entity.js';

@Entity('trips')
export class Trip extends BaseEntity {
  @ManyToOne(() => User, (user) => user.trips, { onDelete: 'CASCADE' })
  @JoinColumn()
  user!: User;

  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => City, (city) => city.trips, { onDelete: 'RESTRICT' })
  @JoinColumn()
  city!: City;

  @Index()
  @Column({ type: 'uuid' })
  cityId!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Index()
  @Column({ type: 'enum', enum: TripStatus, default: TripStatus.PLANNING })
  status!: TripStatus;

  @Column({ type: 'integer' })
  totalBudgetKrw!: number;

  @Column({ type: 'smallint' })
  travelMonth!: number;

  @Column({ type: 'smallint' })
  travelYear!: number;

  @Column({ type: 'smallint' })
  durationDays!: number;

  @Column({ type: 'date', nullable: true })
  startDate!: string | null;

  @Column({ type: 'date', nullable: true })
  endDate!: string | null;

  @Column({ type: 'varchar', length: 21, nullable: true, unique: true })
  shareToken!: string | null;

  @OneToMany(() => BudgetAllocation, (ba) => ba.trip)
  budgetAllocations!: BudgetAllocation[];

  @OneToMany(() => TripDay, (td) => td.trip)
  tripDays!: TripDay[];
}
