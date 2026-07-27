import { useTheme, type ThemeMode } from '@/hooks/useTheme';
import { Icon } from './Icon';
import { cn } from '@/lib/cn';

const modes: { mode: ThemeMode; icon: JSX.Element; label: string }[] = [
  { mode: 'light', icon: <Icon.Sun size={15} />, label: 'Light' },
  { mode: 'dark', icon: <Icon.Moon size={15} />, label: 'Dark' },
  { mode: 'system', icon: <Icon.Monitor size={15} />, label: 'System' },
];

export function ThemeToggle() {
  const { mode, setMode } = useTheme();
  return (
    <div className="inline-flex rounded-xl border border-border bg-surface p-0.5">
      {modes.map((m) => (
        <button
          key={m.mode}
          onClick={() => setMode(m.mode)}
          title={m.label}
          aria-label={m.label}
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-lg transition',
            mode === m.mode
              ? 'bg-elevated text-brand shadow-sm'
              : 'text-subtle hover:text-ink',
          )}
        >
          {m.icon}
        </button>
      ))}
    </div>
  );
}
