import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type OriginFilterValue = 'all' | 'ICN' | 'GMP';

interface OriginFilterProps {
  value: OriginFilterValue;
  onChange: (value: OriginFilterValue) => void;
}

const OPTIONS: Array<{ value: OriginFilterValue; label: string }> = [
  { value: 'all', label: '전체' },
  { value: 'ICN', label: 'ICN' },
  { value: 'GMP', label: 'GMP' },
];

export function OriginFilter({ value, onChange }: OriginFilterProps) {
  return (
    <div className="flex gap-1.5">
      {OPTIONS.map((opt) => (
        <Button
          key={opt.value}
          size="xs"
          variant={value === opt.value ? 'default' : 'outline'}
          className={cn(
            value === opt.value && 'bg-brand-600 hover:bg-brand-700',
          )}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );
}
