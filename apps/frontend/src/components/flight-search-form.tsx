import { useState, useMemo } from 'react';
import { Search, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  presetToDateRange,
  monthToDateRange,
  getSelectableMonths,
  type PeriodPreset,
  type DateRange,
} from '@/lib/date-utils';
import { cn } from '@/lib/utils';

type PeriodSelection =
  | { type: 'preset'; value: PeriodPreset }
  | { type: 'month'; year: number; month: number };

interface FlightSearchFormProps {
  onSearch: (params: {
    dateFrom: string;
    dateTo: string;
    nightsFrom: number;
    nightsTo: number;
  }) => void;
  isSearching: boolean;
}

const NIGHTS_OPTIONS = [
  { label: '1박', from: 1, to: 1 },
  { label: '2박', from: 2, to: 2 },
  { label: '3박', from: 3, to: 3 },
  { label: '4박+', from: 4, to: 7 },
];

export function FlightSearchForm({
  onSearch,
  isSearching,
}: FlightSearchFormProps) {
  const [period, setPeriod] = useState<PeriodSelection | null>(null);
  const [nightsIdx, setNightsIdx] = useState<number | null>(null);

  // TODO: React Compiler 도입 시 useMemo 제거
  const selectableMonths = useMemo(() => getSelectableMonths(), []);

  const canSearch = period !== null && nightsIdx !== null && !isSearching;

  function handleSearch() {
    if (!canSearch) return;

    let dateRange: DateRange;
    if (period.type === 'preset') {
      dateRange = presetToDateRange(period.value);
    } else {
      dateRange = monthToDateRange(period.year, period.month);
    }

    const nights = NIGHTS_OPTIONS[nightsIdx]!;
    onSearch({
      ...dateRange,
      nightsFrom: nights.from,
      nightsTo: nights.to,
    });
  }

  return (
    <div className="space-y-5">
      {/* Origin display */}
      <div>
        <p className="text-sm text-muted-foreground">출발지</p>
        <p className="text-sm font-medium">인천(ICN) + 김포(GMP)</p>
      </div>

      {/* Period selection */}
      <div>
        <p className="mb-2 text-sm font-medium">시기</p>
        <div className="flex flex-wrap gap-2">
          {/* Weekend presets */}
          {(
            [
              { key: 'this-weekend', label: '이번 주말' },
              { key: 'next-weekend', label: '다음 주말' },
            ] as const
          ).map(({ key, label }) => (
            <Button
              key={key}
              size="sm"
              variant={
                period?.type === 'preset' && period.value === key
                  ? 'default'
                  : 'outline'
              }
              className={cn(
                period?.type === 'preset' &&
                  period.value === key &&
                  'bg-brand-600 hover:bg-brand-700',
              )}
              onClick={() => setPeriod({ type: 'preset', value: key })}
            >
              {label}
            </Button>
          ))}

          {/* Month options */}
          {selectableMonths.map(({ year, month, label }) => (
            <Button
              key={`${year}-${month}`}
              size="sm"
              variant={
                period?.type === 'month' &&
                period.year === year &&
                period.month === month
                  ? 'default'
                  : 'outline'
              }
              className={cn(
                period?.type === 'month' &&
                  period.year === year &&
                  period.month === month &&
                  'bg-brand-600 hover:bg-brand-700',
              )}
              onClick={() => setPeriod({ type: 'month', year, month })}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Nights selection */}
      <div>
        <p className="mb-2 text-sm font-medium">기간</p>
        <div className="flex gap-2">
          {NIGHTS_OPTIONS.map((opt, idx) => (
            <Button
              key={opt.label}
              size="sm"
              variant={nightsIdx === idx ? 'default' : 'outline'}
              className={cn(
                'flex-1',
                nightsIdx === idx && 'bg-brand-600 hover:bg-brand-700',
              )}
              onClick={() => setNightsIdx(idx)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Search button */}
      <Button
        className="w-full bg-brand-600 hover:bg-brand-700"
        disabled={!canSearch}
        onClick={handleSearch}
      >
        {isSearching ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Search className="size-4" />
        )}
        {isSearching ? '검색 중...' : '검색하기'}
      </Button>
    </div>
  );
}
