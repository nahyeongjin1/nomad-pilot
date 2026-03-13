import { ExternalLink } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { FlightOfferDto } from '@/lib/types';
import { formatDateShort, formatDuration } from '@/lib/date-utils';

interface FlightResultCardProps {
  offer: FlightOfferDto;
}

function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(price);
}

export function FlightResultCard({ offer }: FlightResultCardProps) {
  const outbound = offer.itineraries[0];
  const firstSeg = outbound?.segments[0];
  const lastSeg = outbound?.segments[outbound.segments.length - 1];
  const isNonStop = outbound?.segments.length === 1;
  const carrierName =
    firstSeg?.carrierName ?? offer.airlines[0] ?? firstSeg?.carrierCode ?? '';

  function handleBook() {
    // Save to localStorage for "My trips" (MVP)
    try {
      const raw = JSON.parse(
        localStorage.getItem('saved-flights') ?? '[]',
      ) as unknown;
      const saved = Array.isArray(raw) ? (raw as FlightOfferDto[]) : [];
      const exists = saved.some((f) => f.deeplink === offer.deeplink);
      if (!exists) {
        saved.unshift(offer);
        localStorage.setItem(
          'saved-flights',
          JSON.stringify(saved.slice(0, 20)),
        );
      }
    } catch {
      // Ignore localStorage errors (quota, corrupt data, etc.)
    }

    // Open deeplink in new tab
    window.open(offer.deeplink, '_blank', 'noopener');
  }

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <p className="text-xl font-bold text-brand-600">
          {formatPrice(offer.totalPrice, offer.currency)}
        </p>
        <p className="text-sm text-muted-foreground">{carrierName}</p>
      </div>

      <div className="mt-2 text-sm text-muted-foreground">
        {outbound && firstSeg && lastSeg && (
          <>
            <p>
              {formatDateShort(firstSeg.departureAt.slice(0, 10))}
              {offer.nightsInDest != null && (
                <>
                  →
                  {offer.itineraries[1]?.segments[0] &&
                    formatDateShort(
                      offer.itineraries[1].segments[0].departureAt.slice(0, 10),
                    )}
                  {'  '}
                  <span className="font-medium text-foreground">
                    {offer.nightsInDest}박
                  </span>
                </>
              )}
            </p>
            <p>
              {offer.originAirport} → {offer.destinationAirport}
              {'  '}
              {isNonStop ? '직항' : `경유 ${outbound.segments.length - 1}회`}
              {'  '}
              {formatDuration(outbound.duration)}
            </p>
          </>
        )}
      </div>

      <div className="mt-3 flex justify-end">
        <Button
          size="sm"
          className="bg-brand-600 hover:bg-brand-700"
          onClick={handleBook}
        >
          예약하기
          <ExternalLink className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
