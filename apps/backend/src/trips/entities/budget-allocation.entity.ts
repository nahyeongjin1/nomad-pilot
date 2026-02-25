import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { BudgetCategory } from '../../common/enums/index.js';
import { Trip } from './trip.entity.js';

@Entity('budget_allocations')
@Unique(['tripId', 'category'])
export class BudgetAllocation extends BaseEntity {
  @ManyToOne(() => Trip, (trip) => trip.budgetAllocations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  trip!: Trip;

  @Column({ type: 'uuid' })
  tripId!: string;

  @Column({ type: 'enum', enum: BudgetCategory })
  category!: BudgetCategory;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: string;

  @Column({ type: 'char', length: 3 })
  currency!: string;

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true })
  exchangeRate!: string | null;

  @Column({ type: 'boolean', default: true })
  isEstimated!: boolean;
}
