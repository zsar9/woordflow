import { useLocale } from './useLocale';
import { translate } from '@/lib/i18n';

/** `t('key')` translation helper bound to the current locale. */
export function useT() {
  const { locale } = useLocale();
  return (key: string) => translate(locale, key);
}
