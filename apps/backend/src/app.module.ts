import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { CitiesModule } from './cities/cities.module';
import { PoisModule } from './pois/pois.module';
import { TripsModule } from './trips/trips.module';
import { FlightsModule } from './flights/flights.module';

@Module({
  imports: [
    ConfigModule,
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV !== 'production' ? 'debug' : 'info',
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty' }
            : undefined,
      },
    }),
    DatabaseModule,
    UsersModule,
    CitiesModule,
    PoisModule,
    TripsModule,
    FlightsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
