import { lazy, Suspense } from 'react';

const ReactQueryDevtools = lazy(async () => {
  const mod = await import('@tanstack/react-query-devtools');
  return { default: mod.ReactQueryDevtools };
});

export function DevTools() {
  if (!import.meta.env.DEV) return null;
  return (
    <Suspense fallback={null}>
      <ReactQueryDevtools initialIsOpen={false} />
    </Suspense>
  );
}
