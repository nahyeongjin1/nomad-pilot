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
