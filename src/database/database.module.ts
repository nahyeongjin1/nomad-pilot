import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');

        return {
          type: 'postgres',
          ...(databaseUrl
            ? { url: databaseUrl }
            : {
                host: configService.get<string>('DB_HOST', 'localhost'),
                port: configService.get<number>('DB_PORT', 5432),
                username: configService.get<string>('DB_USERNAME', 'postgres'),
                password: configService.get<string>('DB_PASSWORD', 'postgres'),
                database: configService.get<string>(
                  'DB_DATABASE',
                  'nomad_pilot',
                ),
              }),
          autoLoadEntities: true,
          synchronize: false,
          logging: configService.get<string>('NODE_ENV') === 'development',
          ssl:
            configService.get<string>('NODE_ENV') === 'production'
              ? { rejectUnauthorized: false }
              : false,
        };
      },
    }),
  ],
})
export class DatabaseModule {}
