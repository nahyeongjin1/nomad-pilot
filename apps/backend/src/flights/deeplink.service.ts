import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface DeeplinkParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults?: number;
}

@Injectable()
export class DeeplinkService {
  constructor(private readonly configService: ConfigService) {}

  /** Build Aviasales affiliate deeplink via tp.media tracker */
  buildDeeplink(params: DeeplinkParams): string {
    const searchUrl = this.buildSearchUrl(params);
    const marker = this.configService.get<string>('TRAVELPAYOUTS_MARKER');

    if (!marker) {
      return searchUrl;
    }

    // p=4114: Aviasales program ID in Travelpayouts
    const query = new URLSearchParams({
      marker,
      p: '4114',
      u: searchUrl,
    });

    return `https://tp.media/r?${query.toString()}`;
  }

  private buildSearchUrl(params: DeeplinkParams): string {
    const {
      origin,
      destination,
      departureDate,
      returnDate,
      adults = 1,
    } = params;

    // Aviasales compact params: {origin}{DDMM}{dest}{DDMM_return?}{adults}
    const depDDMM = this.toDDMM(departureDate);
    let compact = `${origin}${depDDMM}${destination}`;
    if (returnDate) {
      compact += this.toDDMM(returnDate);
    }
    compact += String(adults);

    return `https://www.aviasales.com/?params=${compact}`;
  }

  /** Convert YYYY-MM-DD to DDMM */
  private toDDMM(date: string): string {
    const [, month, day] = date.split('-');
    return `${day}${month}`;
  }
}
