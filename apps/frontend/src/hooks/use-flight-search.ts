import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { FlightOfferDto, FlexibleSearchParams } from '@/lib/types';

export function useFlightSearch() {
  return useMutation({
    mutationFn: (params: FlexibleSearchParams) => {
      const searchParams: Record<string, string | number> = {
        destination: params.destination,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
        nightsFrom: params.nightsFrom,
        nightsTo: params.nightsTo,
      };
      if (params.origins) searchParams.origins = params.origins;
      if (params.adults) searchParams.adults = params.adults;
      if (params.maxResults) searchParams.maxResults = params.maxResults;

      return api
        .get('flights/flexible-search', { searchParams })
        .json<FlightOfferDto[]>();
    },
  });
}
