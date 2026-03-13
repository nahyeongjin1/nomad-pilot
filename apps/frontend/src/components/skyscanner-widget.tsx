import type { OriginFilterValue } from '@/components/origin-filter';

interface SkyscannerWidgetProps {
  destinationIata: string;
  originFilter?: OriginFilterValue;
  prominent?: boolean;
  /** Outbound date YYYY-MM-DD (optional, pre-fills Skyscanner) */
  outboundDate?: string;
  /** Inbound date YYYY-MM-DD (optional, pre-fills Skyscanner) */
  inboundDate?: string;
}

/** Convert YYYY-MM-DD → YYMMDD for Skyscanner URL */
function toSkyscannerDate(dateStr: string): string {
  return dateStr.slice(2).replace(/-/g, '');
}

export function SkyscannerWidget({
  destinationIata,
  originFilter,
  prominent = false,
  outboundDate,
  inboundDate,
}: SkyscannerWidgetProps) {
  const originIata = originFilter === 'GMP' ? 'GMP' : 'ICN';

  // Build Skyscanner search URL with optional dates
  let skyscannerUrl = `https://www.skyscanner.co.kr/transport/flights/${originIata.toLowerCase()}/${destinationIata.toLowerCase()}/`;
  if (outboundDate) {
    skyscannerUrl += `${toSkyscannerDate(outboundDate)}/`;
    if (inboundDate) {
      skyscannerUrl += `${toSkyscannerDate(inboundDate)}/`;
    }
  }

  return (
    <div
      className={`rounded-xl border bg-muted/30 text-center ${prominent ? 'p-6' : 'p-4'}`}
    >
      <p className={`font-medium ${prominent ? 'text-base' : 'text-sm'}`}>
        Skyscanner에서 더 많은 항공편 검색
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {originIata} → {destinationIata}
      </p>
      <a
        href={skyscannerUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`mt-3 inline-block rounded-lg bg-[#0770e3] px-6 text-white hover:bg-[#0660c7] ${prominent ? 'py-3 text-base' : 'py-2 text-sm'}`}
      >
        Skyscanner에서 검색하기
      </a>
    </div>
  );
}
