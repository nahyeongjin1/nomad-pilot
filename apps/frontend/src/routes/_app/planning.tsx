import { createFileRoute } from '@tanstack/react-router';
import { Map } from 'lucide-react';

export const Route = createFileRoute('/_app/planning')({
  component: PlanningPage,
});

function PlanningPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20">
      <Map className="size-12 text-brand-600" />
      <h1 className="text-xl font-bold">플래닝</h1>
      <p className="text-sm text-muted-foreground">여행을 계획해보세요</p>
    </div>
  );
}
