import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import type {
  AmadeusFlightOffersResponse,
  AmadeusTokenResponse,
} from './interfaces/amadeus.interfaces.js';

interface SearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults?: number;
  nonStop?: boolean;
  max?: number;
}

@Injectable()
export class AmadeusService {
  private readonly logger = new Logger(AmadeusService.name);
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;

  private accessToken: string | null = null;
  private tokenExpiresAt = 0;
  private tokenPromise: Promise<string> | null = null;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl =
      this.configService.get<string>('AMADEUS_BASE_URL') ??
      'https://test.api.amadeus.com';
    this.clientId = this.configService.get<string>('AMADEUS_CLIENT_ID') ?? '';
    this.clientSecret =
      this.configService.get<string>('AMADEUS_CLIENT_SECRET') ?? '';
  }

  async searchFlightOffers(
    params: SearchParams,
  ): Promise<AmadeusFlightOffersResponse> {
    try {
      return await this.doSearch(params);
    } catch (error) {
      if (this.isAxiosError(error) && error.response?.status === 401) {
        this.logger.warn('Token expired, refreshing and retrying');
        this.invalidateToken();
        return this.doSearch(params);
      }
      throw this.mapError(error);
    }
  }

  private async doSearch(
    params: SearchParams,
  ): Promise<AmadeusFlightOffersResponse> {
    const token = await this.getToken();
    const {
      origin,
      destination,
      departureDate,
      returnDate,
      adults = 1,
      nonStop = false,
      max = 5,
    } = params;

    const query = new URLSearchParams({
      originLocationCode: origin,
      destinationLocationCode: destination,
      departureDate,
      adults: String(adults),
      nonStop: String(nonStop),
      max: String(max),
      currencyCode: 'KRW',
    });

    if (returnDate) {
      query.set('returnDate', returnDate);
    }

    const url = `${this.baseUrl}/v2/shopping/flight-offers?${query.toString()}`;
    const { data } = await firstValueFrom(
      this.httpService.get<AmadeusFlightOffersResponse>(url, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10_000,
      }),
    );

    return data;
  }

  private async getToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    // Share a single in-flight token request (thundering herd prevention)
    if (!this.tokenPromise) {
      this.tokenPromise = this.fetchToken();
    }

    try {
      return await this.tokenPromise;
    } finally {
      this.tokenPromise = null;
    }
  }

  private async fetchToken(): Promise<string> {
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
    }).toString();

    const { data } = await firstValueFrom(
      this.httpService.post<AmadeusTokenResponse>(
        `${this.baseUrl}/v1/security/oauth2/token`,
        body,
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      ),
    );

    // Refresh 60s before actual expiry
    this.tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
    this.accessToken = data.access_token;

    return data.access_token;
  }

  private invalidateToken(): void {
    this.accessToken = null;
    this.tokenExpiresAt = 0;
    this.tokenPromise = null;
  }

  private isAxiosError(
    error: unknown,
  ): error is { response?: { status: number } } {
    return typeof error === 'object' && error !== null && 'response' in error;
  }

  private mapError(error: unknown): Error {
    if (!this.isAxiosError(error) || !error.response) {
      return new BadGatewayException('Amadeus API request failed');
    }

    const status = error.response.status;

    if (status === 400) {
      return new BadRequestException('Invalid flight search parameters');
    }
    if (status === 429) {
      return new ServiceUnavailableException('Amadeus API rate limit exceeded');
    }
    return new BadGatewayException('Amadeus API error');
  }
}
