import { QueryClientProvider } from '@tanstack/react-query';
import { createRootRoute, Outlet } from '@tanstack/react-router';

import { DevTools } from '@/components/dev-tools';
import { Toaster } from '@/components/ui/sonner';
import { queryClient } from '@/lib/query-client';

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster position="top-center" closeButton />
      <DevTools />
    </QueryClientProvider>
  );
}
