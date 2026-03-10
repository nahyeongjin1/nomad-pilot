import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CityDto } from '@/lib/types';

export function useCities() {
  return useQuery({
    queryKey: ['cities'],
    queryFn: () => api.get('cities').json<CityDto[]>(),
    staleTime: Infinity,
  });
}
