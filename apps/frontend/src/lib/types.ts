export interface CityDto {
  id: string;
  nameKo: string;
  nameEn: string;
  nameLocal: string;
  countryCode: string;
  imageUrl: string | null;
  imageAuthorName: string | null;
  imageAuthorUrl: string | null;
  iataCodes: string[];
}

export interface CityLowestPriceDto {
  cityId: string;
  cityNameKo: string;
  cityNameEn: string;
  lowestPrice: number | null;
  currency: string;
  gate: string | null;
  originAirport: string | null;
  departDate: string | null;
  returnDate: string | null;
}

export interface LowestPricesResponseDto {
  cities: CityLowestPriceDto[];
  origins: string[];
  cachedAt: string;
}

// Flight search types

export interface SegmentDto {
  departureAirport: string;
  departureAt: string;
  departureTerminal?: string;
  arrivalAirport: string;
  arrivalAt: string;
  arrivalTerminal?: string;
  carrierCode: string;
  carrierName?: string;
  flightNumber: string;
  duration: string;
  numberOfStops: number;
}

export interface ItineraryDto {
  duration: string;
  segments: SegmentDto[];
}

export interface FlightOfferDto {
  currency: string;
  totalPrice: number;
  originAirport: string;
  destinationAirport: string;
  nightsInDest: number | null;
  itineraries: ItineraryDto[];
  airlines: string[];
  deeplink: string;
  cachedAt?: string;
}

export interface FlexibleSearchParams {
  origins?: string;
  destination: string;
  dateFrom: string;
  dateTo: string;
  nightsFrom: number;
  nightsTo: number;
  adults?: number;
  maxResults?: number;
}
