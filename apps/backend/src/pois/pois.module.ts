import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Poi } from './entities/poi.entity.js';
import { PoisService } from './pois.service.js';
import { PoisController } from './pois.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Poi])],
  controllers: [PoisController],
  providers: [PoisService],
  exports: [PoisService, TypeOrmModule],
})
export class PoisModule {}
