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
    <div className="flex h-full min-h-screen bg-canvas">
      {/* Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-surface/60 px-3 py-4 backdrop-blur md:flex">
        <button
          onClick={() => navigate('/')}
          className="mb-6 flex items-center gap-2.5 px-2 text-left"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white shadow-sm">
            <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
              <path
                d="M8 21 L13 11 L16 18 L19 11 L24 21"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-ink">
            WoordFlow
          </span>
        </button>

        <button
          onClick={() => setSearchOpen(true)}
          className="mb-4 flex items-center gap-2 rounded-xl border border-border bg-canvas px-3 py-2 text-sm text-subtle transition hover:text-ink"
        >
          <Icon.Search size={15} />
          <span>Search…</span>
          <span className="kbd ml-auto">⌘K</span>
        </button>

        <nav className="flex flex-col gap-0.5">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition',
                  isActive
                    ? 'bg-brand/10 text-brand'
                    : 'text-muted hover:bg-canvas hover:text-ink',
                )
              }
            >
              <item.icon size={17} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-canvas px-3 py-2.5">
            <span className="text-warning">
              <Icon.Flame size={18} />
            </span>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-ink">
                {streak.current} day{streak.current === 1 ? '' : 's'}
              </div>
              <div className="text-[11px] text-subtle">
                {streak.current > 0 ? 'Keep it going!' : 'Study to start a streak'}
              </div>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-surface/80 px-4 py-2.5 backdrop-blur md:hidden">
          <button onClick={() => navigate('/')} className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-white">
              <svg width="15" height="15" viewBox="0 0 32 32" fill="none">
                <path d="M8 21 L13 11 L16 18 L19 11 L24 21" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="font-semibold text-ink">WoordFlow</span>
          </button>
          <button
            onClick={() => setSearchOpen(true)}
            className="ml-auto rounded-lg p-1.5 text-muted"
            aria-label="Search"
          >
            <Icon.Search size={18} />
          </button>
          <ThemeToggle />
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <nav className="sticky bottom-0 z-20 flex items-center justify-around border-t border-border bg-surface/90 py-1.5 backdrop-blur md:hidden">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-0.5 rounded-lg px-4 py-1 text-[11px] font-medium',
                  isActive ? 'text-brand' : 'text-subtle',
                )
              }
            >
              <item.icon size={19} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
