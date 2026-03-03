import { lazy, Suspense } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createRootRoute, Outlet } from '@tanstack/react-router';

import { queryClient } from '@/lib/query-client';

const ReactQueryDevtools = lazy(async () => {
  const mod = await import('@tanstack/react-query-devtools');
  return { default: mod.ReactQueryDevtools };
});

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      {import.meta.env.DEV && (
        <Suspense fallback={null}>
          <ReactQueryDevtools initialIsOpen={false} />
        </Suspense>
      )}
    </QueryClientProvider>
  );
}
