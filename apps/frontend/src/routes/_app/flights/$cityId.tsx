import { useState, useMemo } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, ChevronDown, ChevronUp, SearchX } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { FlightSearchForm } from '@/components/flight-search-form';
import { FlightResultCard } from '@/components/flight-result-card';
import {
  OriginFilter,
  type OriginFilterValue,
} from '@/components/origin-filter';
import { SkyscannerWidget } from '@/components/skyscanner-widget';
import { useCities } from '@/hooks/use-cities';
import { useFlightSearch } from '@/hooks/use-flight-search';

export const Route = createFileRoute('/_app/flights/$cityId')({
  component: FlightSearchPage,
});

function FlightSearchPage() {
  const { cityId } = Route.useParams();
  const { data: cities } = useCities();
  const city = cities?.find((c) => c.id === cityId);

  const flightSearch = useFlightSearch();
  const [formCollapsed, setFormCollapsed] = useState(false);
  const [originFilter, setOriginFilter] = useState<OriginFilterValue>('all');
  const [searchDates, setSearchDates] = useState<{
    dateFrom: string;
    dateTo: string;
    nightsFrom: number;
  } | null>(null);

  const offers = flightSearch.data;
  const hasSearched = flightSearch.isSuccess || flightSearch.isError;

  const filteredOffers = useMemo(() => {
    if (!offers) return [];
    if (originFilter === 'all') return offers;
    return offers.filter((o) => o.originAirport === originFilter);
  }, [offers, originFilter]);

  function handleSearch(params: {
    dateFrom: string;
    dateTo: string;
    nightsFrom: number;
    nightsTo: number;
  }) {
    setOriginFilter('all');
    setSearchDates(params);
    flightSearch.mutate({
      destination: cityId,
      ...params,
    });
    setFormCollapsed(true);
  }

  // Compute approximate Skyscanner dates from search params
  const skyscannerOutbound = searchDates?.dateFrom;
  // TODO: React Compiler 도입 시 useMemo 제거
  const skyscannerInbound = useMemo(() => {
    if (!searchDates) return undefined;
    const d = new Date(searchDates.dateFrom + 'T00:00:00');
    d.setDate(d.getDate() + searchDates.nightsFrom);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, [searchDates]);

  const destinationIata = city?.iataCodes[0] ?? 'NRT';

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col px-4 py-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/">
          <Button size="icon-sm" variant="ghost">
            <ArrowLeft className="size-5" />
          </Button>
        </Link>
        <h1 className="text-lg font-bold">
          {city ? `${city.nameKo} 항공편 검색` : '항공편 검색'}
        </h1>
      </div>

      {/* Search form */}
      <div className="mt-4">
        {hasSearched && formCollapsed ? (
          <Button
            variant="outline"
            className="w-full justify-between"
            onClick={() => setFormCollapsed(false)}
          >
            검색 조건 수정
            <ChevronDown className="size-4" />
          </Button>
        ) : (
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            {hasSearched && (
              <div className="mb-3 flex justify-end">
                <Button
                  size="icon-xs"
                  variant="ghost"
                  onClick={() => setFormCollapsed(true)}
                >
                  <ChevronUp className="size-4" />
                </Button>
              </div>
            )}
            <FlightSearchForm
              onSearch={handleSearch}
              isSearching={flightSearch.isPending}
            />
          </div>
        )}
      </div>

      {/* Results */}
      {hasSearched && (
        <div className="mt-5 space-y-4">
          {/* Origin filter */}
          {offers && offers.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                {filteredOffers.length}건의 결과
              </p>
              <OriginFilter value={originFilter} onChange={setOriginFilter} />
            </div>
          )}

          {/* Flight cards */}
          {filteredOffers.length > 0 ? (
            <>
              {filteredOffers.map((offer, idx) => (
                <FlightResultCard
                  key={`${offer.deeplink}-${idx}`}
                  offer={offer}
                />
              ))}
              {/* Skyscanner widget at bottom */}
              <SkyscannerWidget
                destinationIata={destinationIata}
                originFilter={originFilter}
                outboundDate={skyscannerOutbound}
                inboundDate={skyscannerInbound}
              />
            </>
          ) : flightSearch.isError ? (
            <div className="py-8 text-center">
              <SearchX className="mx-auto size-12 text-muted-foreground/50" />
              <p className="mt-3 font-medium">검색 중 오류가 발생했습니다</p>
              <p className="mt-1 text-sm text-muted-foreground">
                잠시 후 다시 시도해주세요
              </p>
            </div>
          ) : (
            /* Empty results */
            <div className="py-6 text-center">
              <SearchX className="mx-auto size-12 text-muted-foreground/50" />
              <p className="mt-3 font-medium">검색 결과가 없습니다</p>
              <p className="mt-1 text-sm text-muted-foreground">
                조건을 변경하거나 Skyscanner에서 검색해보세요
              </p>
              <div className="mt-4">
                <SkyscannerWidget
                  destinationIata={destinationIata}
                  originFilter={originFilter}
                  outboundDate={skyscannerOutbound}
                  inboundDate={skyscannerInbound}
                  prominent
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
