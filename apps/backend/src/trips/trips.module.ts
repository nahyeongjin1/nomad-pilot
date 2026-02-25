import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Trip } from './entities/trip.entity.js';
import { BudgetAllocation } from './entities/budget-allocation.entity.js';
import { TripDay } from './entities/trip-day.entity.js';
import { TripDayPoi } from './entities/trip-day-poi.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Trip, BudgetAllocation, TripDay, TripDayPoi]),
  ],
  exports: [TypeOrmModule],
})
export class TripsModule {}
