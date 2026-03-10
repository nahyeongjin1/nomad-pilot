import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { LowestPricesResponseDto } from '@/lib/types';

export function useLowestPrices() {
  return useQuery({
    queryKey: ['lowest-prices'],
    queryFn: () =>
      api.get('flights/lowest-prices').json<LowestPricesResponseDto>(),
    staleTime: 30 * 60 * 1000,
  });
}
