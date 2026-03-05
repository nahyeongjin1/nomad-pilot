import { Outlet } from '@tanstack/react-router';

import { AppHeader } from './app-header';
import { BottomNav } from './bottom-nav';

export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="flex-1 pb-16">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
