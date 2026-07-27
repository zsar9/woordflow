import { useLocale, type Locale } from '@/hooks/useLocale';
import { cn } from '@/lib/cn';

const options: { locale: Locale; label: string }[] = [
  { locale: 'en', label: 'EN' },
  { locale: 'nl', label: 'NL' },
];

/** Top-right EN/NL toggle for the app's own interface language. */
export function LocaleToggle() {
  const { locale, setLocale } = useLocale();
  return (
    <div className="inline-flex rounded-full border border-border bg-surface p-0.5">
      {options.map((o) => (
        <button
          key={o.locale}
          onClick={() => setLocale(o.locale)}
          title={o.locale === 'en' ? 'English' : 'Nederlands'}
          aria-label={o.locale === 'en' ? 'Switch to English' : 'Schakel naar Nederlands'}
          className={cn(
            'flex h-7 min-w-[2rem] items-center justify-center rounded-full px-2 text-[11px] font-semibold tracking-wide transition',
            locale === o.locale ? 'bg-ink text-canvas' : 'text-subtle hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
