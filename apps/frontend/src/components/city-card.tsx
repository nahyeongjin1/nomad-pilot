import { Plane, MapPin, CalendarPlus } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import type { CityDto, CityLowestPriceDto } from '@/lib/types';
import { optimizeImageUrl, buildAttributionUrl } from '@/lib/unsplash';

interface CityCardProps {
  city: CityDto;
  price?: CityLowestPriceDto;
  priceLoading?: boolean;
  index: number;
}

function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(price);
}

const handleComingSoon = () => {
  toast('준비 중이에요', {
    description: '곧 만나볼 수 있어요!',
  });
};

export function CityCard({ city, price, priceLoading, index }: CityCardProps) {
  const navigate = useNavigate();
  const imageUrl = city.imageUrl ? optimizeImageUrl(city.imageUrl) : null;
  const isEager = index === 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Image card */}
      <div className="relative aspect-3/4 max-h-[calc(100dvh-19rem)] w-full overflow-hidden rounded-2xl bg-muted">
        {imageUrl && (
          <img
            src={imageUrl}
            alt={`${city.nameKo} (${city.nameEn})`}
            className="absolute inset-0 size-full object-cover"
            loading={isEager ? 'eager' : 'lazy'}
            fetchPriority={isEager ? 'high' : undefined}
          />
        )}

        {/* Unsplash attribution */}
        {city.imageAuthorName && city.imageAuthorUrl && (
          <span className="absolute bottom-3 right-3 text-xs text-white/60">
            Photo by{' '}
            <a
              href={buildAttributionUrl(city.imageAuthorUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-white/80"
            >
              {city.imageAuthorName}
            </a>{' '}
            on{' '}
            <a
              href="https://unsplash.com?utm_source=nomad_pilot&utm_medium=referral"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-white/80"
            >
              Unsplash
            </a>
          </span>
        )}
      </div>

      {/* City info */}
      <div>
        <div className="flex items-baseline gap-2">
          <h2 className="text-2xl font-bold">{city.nameKo}</h2>
          <span className="text-sm text-muted-foreground">{city.nameEn}</span>
        </div>
        <div className="mt-1">
          {priceLoading ? (
            <div className="h-5 w-28 animate-pulse rounded bg-muted" />
          ) : price?.lowestPrice != null ? (
            <p className="text-base font-semibold text-brand-600">
              <span className="text-sm font-normal text-muted-foreground">
                편도 최저{' '}
              </span>
              {formatPrice(price.lowestPrice, price.currency)}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">가격 정보 없음</p>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 active:scale-95 transition-transform"
          onClick={() => {
            void navigate({
              to: '/flights/$cityId',
              params: { cityId: city.id },
            });
          }}
        >
          <Plane className="size-4" />
          항공편
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 active:scale-95 transition-transform"
          onClick={handleComingSoon}
        >
          <MapPin className="size-4" />
          명소
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 active:scale-95 transition-transform"
          onClick={handleComingSoon}
        >
          <CalendarPlus className="size-4" />
          여행 계획
        </Button>
      </div>
    </div>
  );
}
