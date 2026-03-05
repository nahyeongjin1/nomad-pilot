import { createFileRoute } from '@tanstack/react-router';
import { CalendarCheck2 } from 'lucide-react';

export const Route = createFileRoute('/_app/trips')({
  component: TripsPage,
});

function TripsPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20">
      <CalendarCheck2 className="size-12 text-brand-600" />
      <h1 className="text-xl font-bold">내 여행</h1>
      <p className="text-sm text-muted-foreground">내 여행 일정을 확인하세요</p>
    </div>
  );
}
