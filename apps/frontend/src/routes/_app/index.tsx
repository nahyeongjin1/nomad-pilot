import { createFileRoute } from '@tanstack/react-router';
import { Compass } from 'lucide-react';

export const Route = createFileRoute('/_app/')({
  component: ExplorePage,
});

function ExplorePage() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20">
      <Compass className="size-12 text-brand-600" />
      <h1 className="text-xl font-bold">탐색</h1>
      <p className="text-sm text-muted-foreground">도시를 탐색해보세요</p>
    </div>
  );
}
