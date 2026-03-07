/** Travelpayouts /aviasales/v3/get_latest_prices response */
export interface TravelpayoutsLatestResponse {
  success: boolean;
  currency: string;
  data: TravelpayoutsPriceRaw[];
}

export interface TravelpayoutsPriceRaw {
  origin: string;
  destination: string;
  depart_date: string;
  return_date: string;
  number_of_changes: number;
  value: number;
  found_at: string;
  gate: string;
  distance: number;
  trip_class: number;
  duration: number;
  actual: boolean;
  show_to_affiliates: boolean;
}

export interface TravelpayoutsPrice {
  origin: string;
  destination: string;
  price: number;
  gate: string;
  departDate: string;
  returnDate: string;
  numberOfChanges: number;
}
