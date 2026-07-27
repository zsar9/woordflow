import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { cn } from '@/lib/cn';
import { GlobalSearch } from '@/features/dashboard/GlobalSearch';
import { useStreak } from '@/features/stats/useStreak';
import { seedIfEmpty } from '@/lib/seed';

const nav = [
  { to: '/', label: 'Dashboard', icon: Icon.Home, end: true },
  { to: '/stories', label: 'Stories', icon: Icon.Book, end: false },
  { to: '/stats', label: 'Statistics', icon: Icon.Chart, end: false },
  { to: '/settings', label: 'Settings', icon: Icon.Settings, end: false },
];

export function AppLayout() {
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const streak = useStreak();

  // Seed demo content on first ever run.
  useEffect(() => {
    seedIfEmpty();
  }, []);

  // Cmd/Ctrl-K opens global search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      {/* Top nav — no sidebar: one breadcrumb line and ⌘K. */}
      <header className="sticky top-0 z-20 border-b border-border bg-canvas/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-4 sm:px-6 lg:px-8">
          <button onClick={() => navigate('/')} className="shrink-0">
            <span className="font-serif text-xl lowercase tracking-tight text-ink">
              woordflow
            </span>
          </button>

          <nav className="ml-2 hidden items-center gap-1 sm:flex">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'rounded-full px-3 py-1.5 text-sm font-medium transition',
                    isActive ? 'text-ink' : 'text-muted hover:text-ink',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <div
              className="hidden items-center gap-1.5 text-sm text-muted sm:flex"
              title={streak.current > 0 ? 'Keep it going!' : 'Study to start a streak'}
            >
              <Icon.Flame size={15} className={streak.current > 0 ? 'text-warning' : ''} />
              <span className="tabular-nums">{streak.current}</span>
            </div>
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-subtle transition hover:text-ink"
            >
              <Icon.Search size={14} />
              <span className="kbd">⌘K</span>
            </button>
            <ThemeToggle />
          </div>
        </div>

        {/* Mobile nav row */}
        <nav className="flex items-center gap-1 overflow-x-auto border-t border-border px-4 py-2 sm:hidden">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium',
                  isActive ? 'bg-ink text-canvas' : 'text-muted',
                )
              }
            >
              <item.icon size={15} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
