import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CacheModule } from '@nestjs/cache-manager';
import { TypeOrmModule } from '@nestjs/typeorm';
import { City } from '../cities/entities/city.entity.js';
import { FlightsController } from './flights.controller.js';
import { FlightsService } from './flights.service.js';
import { AmadeusService } from './amadeus.service.js';
import { DeeplinkService } from './deeplink.service.js';

@Module({
  imports: [
    HttpModule.register({ timeout: 10_000 }),
    CacheModule.register({ ttl: 15 * 60 * 1000 }),
    TypeOrmModule.forFeature([City]),
  ],
  controllers: [FlightsController],
  providers: [FlightsService, AmadeusService, DeeplinkService],
})
export class FlightsModule {}
