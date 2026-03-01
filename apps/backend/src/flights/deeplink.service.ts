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

  buildSearchUrl(params: DeeplinkParams): string {
    const {
      origin,
      destination,
      departureDate,
      returnDate,
      adults = 1,
    } = params;
    const isOneWay = !returnDate;

    const query = new URLSearchParams({
      origin_iata: origin,
      destination_iata: destination,
      depart_date: departureDate,
      adults: String(adults),
      children: '0',
      infants: '0',
      trip_class: '0',
      one_way: String(isOneWay),
    });

    if (returnDate) {
      query.set('return_date', returnDate);
    }

    return `https://search.aviasales.com/flights/?${query.toString()}`;
  }

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
}
