import { Link } from '@tanstack/react-router';
import { CalendarCheck2, Compass, Map, User } from 'lucide-react';

const tabs = [
  { to: '/', icon: Compass, label: '탐색' },
  { to: '/planning', icon: Map, label: '플래닝' },
  { to: '/trips', icon: CalendarCheck2, label: '내 여행' },
  { to: '/my', icon: User, label: '마이' },
];

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background pb-[env(safe-area-inset-bottom)]">
      <div className="flex h-14 items-center justify-around">
        {tabs.map(({ to, icon: Icon, label }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: to === '/' }}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 text-muted-foreground data-[status=active]:text-brand-600"
          >
            <Icon className="size-5" />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
