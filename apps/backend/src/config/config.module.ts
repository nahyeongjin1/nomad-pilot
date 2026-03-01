import { resolve } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        resolve(__dirname, '../../.env'),
        resolve(__dirname, '../../../../.env'),
      ],
    }),
  ],
})
export class ConfigModule {}
