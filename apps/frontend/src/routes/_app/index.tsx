import { useCallback, useEffect, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { RefreshCw, WifiOff } from 'lucide-react';

import { CityCard } from '@/components/city-card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCities } from '@/hooks/use-cities';
import { useLowestPrices } from '@/hooks/use-lowest-prices';

export const Route = createFileRoute('/_app/')({
  component: ExplorePage,
});

function ExplorePage() {
  const {
    data: cities,
    isLoading: citiesLoading,
    isError: citiesError,
    refetch: refetchCities,
  } = useCities();
  const { data: pricesData, isLoading: pricesLoading } = useLowestPrices();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [api, setApi] = useState<CarouselApi>();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const onSelect = useCallback(() => {
    if (!api) return;
    setCurrentIndex(api.selectedScrollSnap());
  }, [api]);

  useEffect(() => {
    if (!api) return;
    api.on('select', onSelect);
    return () => {
      api.off('select', onSelect);
    };
  }, [api, onSelect]);

  // Price lookup by cityId
  const priceMap = pricesData?.cities.reduce(
    (acc, p) => {
      acc[p.cityId] = p;
      return acc;
    },
    {} as Record<string, (typeof pricesData.cities)[number]>,
  );

  if (citiesLoading) {
    return (
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="aspect-3/4 w-full max-w-md animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  if (citiesError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
        <p className="text-muted-foreground">도시 정보를 불러올 수 없습니다</p>
        <Button variant="outline" onClick={() => void refetchCities()}>
          <RefreshCw className="size-4" />
          다시 시도
        </Button>
      </div>
    );
  }

  if (!cities?.length) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
        <p className="text-muted-foreground">표시할 도시가 없습니다</p>
        <Button variant="outline" onClick={() => void refetchCities()}>
          <RefreshCw className="size-4" />
          다시 시도
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      {isOffline && (
        <div className="flex items-center justify-center gap-2 bg-muted px-4 py-2 text-sm text-muted-foreground">
          <WifiOff className="size-4" />
          오프라인 상태입니다
        </div>
      )}

      <div className="flex flex-1 flex-col items-center justify-center px-4 py-4">
        <Carousel setApi={setApi} className="w-full max-w-md">
          <CarouselContent>
            {cities.map((city, i) => (
              <CarouselItem key={city.id}>
                <CityCard
                  city={city}
                  price={priceMap?.[city.id]}
                  priceLoading={pricesLoading}
                  index={i}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        {/* Dot indicators */}
        <div className="mt-4 flex gap-2">
          {cities.map((city, i) => (
            <button
              type="button"
              key={city.id}
              onClick={() => api?.scrollTo(i)}
              aria-label={`${city.nameKo}로 이동`}
              aria-pressed={i === currentIndex}
              className={cn(
                'size-2 rounded-full transition-all',
                i === currentIndex
                  ? 'w-6 bg-brand-600'
                  : 'bg-muted-foreground/30',
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
