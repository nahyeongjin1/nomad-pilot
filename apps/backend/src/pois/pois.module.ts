import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Poi } from './entities/poi.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Poi])],
  exports: [TypeOrmModule],
})
export class PoisModule {}
