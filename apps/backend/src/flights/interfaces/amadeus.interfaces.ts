/** Amadeus OAuth2 token response */
export interface AmadeusTokenResponse {
  type: string;
  username: string;
  application_name: string;
  client_id: string;
  token_type: string;
  access_token: string;
  expires_in: number;
  state: string;
  scope: string;
}

/** Amadeus Flight Offers Search v2 response */
export interface AmadeusFlightOffersResponse {
  meta: { count: number };
  data: AmadeusFlightOffer[];
  dictionaries?: AmadeusDictionaries;
}

export interface AmadeusFlightOffer {
  type: string;
  id: string;
  source: string;
  instantTicketingRequired: boolean;
  nonHomogeneous: boolean;
  oneWay: boolean;
  lastTicketingDate: string;
  numberOfBookableSeats: number;
  itineraries: AmadeusItinerary[];
  price: AmadeusPrice;
  pricingOptions: { fareType: string[]; includedCheckedBagsOnly: boolean };
  validatingAirlineCodes: string[];
  travelerPricings: AmadeusTravelerPricing[];
}

export interface AmadeusItinerary {
  duration: string;
  segments: AmadeusSegment[];
}

export interface AmadeusSegment {
  departure: AmadeusEndpoint;
  arrival: AmadeusEndpoint;
  carrierCode: string;
  number: string;
  aircraft: { code: string };
  operating?: { carrierCode: string };
  duration: string;
  id: string;
  numberOfStops: number;
  blacklistedInEU: boolean;
}

export interface AmadeusEndpoint {
  iataCode: string;
  terminal?: string;
  at: string;
}

export interface AmadeusPrice {
  currency: string;
  total: string;
  base: string;
  fees?: AmadeusFee[];
  grandTotal: string;
}

export interface AmadeusFee {
  amount: string;
  type: string;
}

export interface AmadeusTravelerPricing {
  travelerId: string;
  fareOption: string;
  travelerType: string;
  price: { currency: string; total: string; base: string };
  fareDetailsBySegment: AmadeusFareDetail[];
}

export interface AmadeusFareDetail {
  segmentId: string;
  cabin: string;
  fareBasis: string;
  class: string;
  includedCheckedBags?: {
    weight?: number;
    weightUnit?: string;
    quantity?: number;
  };
}

export interface AmadeusDictionaries {
  carriers?: Record<string, string>;
  aircraft?: Record<string, string>;
  currencies?: Record<string, string>;
  locations?: Record<string, { cityCode: string; countryCode: string }>;
}

/** Amadeus API error response */
export interface AmadeusErrorResponse {
  errors: AmadeusError[];
}

export interface AmadeusError {
  status: number;
  code: number;
  title: string;
  detail: string;
  source?: { parameter?: string; pointer?: string };
}
