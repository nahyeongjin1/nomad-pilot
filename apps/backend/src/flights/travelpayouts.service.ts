import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import type {
  TravelpayoutsLatestResponse,
  TravelpayoutsPrice,
  TravelpayoutsPriceRaw,
} from './interfaces/travelpayouts.interfaces.js';

@Injectable()
export class TravelpayoutsService {
  private readonly logger = new Logger(TravelpayoutsService.name);
  private readonly apiToken: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiToken =
      this.configService.get<string>('TRAVELPAYOUTS_API_TOKEN') ?? '';

    if (!this.apiToken) {
      this.logger.warn('TRAVELPAYOUTS_API_TOKEN is not configured');
    }
  }

  async getLatestPrices(origin: string): Promise<TravelpayoutsPrice[]> {
    if (!this.apiToken) {
      return [];
    }

    try {
      const query = new URLSearchParams({
        origin,
        currency: 'KRW',
        period_type: 'year',
        sorting: 'price',
        limit: '30',
        one_way: 'false',
        token: this.apiToken,
      });

      const { data } = await firstValueFrom(
        this.httpService.get<TravelpayoutsLatestResponse>(
          `https://api.travelpayouts.com/aviasales/v3/get_latest_prices?${query.toString()}`,
          { timeout: 10_000 },
        ),
      );

      if (!data.success) {
        this.logger.warn('Travelpayouts API returned success=false');
        return [];
      }

      return data.data.map((raw) => this.transformPrice(raw));
    } catch (error) {
      this.logger.warn(
        `Travelpayouts API request failed for origin=${origin}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return [];
    }
  }

  private transformPrice(raw: TravelpayoutsPriceRaw): TravelpayoutsPrice {
    return {
      origin: raw.origin,
      destination: raw.destination,
      price: raw.value,
      gate: raw.gate,
      departDate: raw.depart_date.substring(0, 10),
      returnDate: raw.return_date.substring(0, 10),
      numberOfChanges: raw.number_of_changes,
    };
  }
}
