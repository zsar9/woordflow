import { useEffect, useRef } from 'react';

export type HotkeyHandler = (e: KeyboardEvent) => void;

export interface HotkeyMap {
  [key: string]: HotkeyHandler;
}

/**
 * Global keyboard handler. Keys are matched case-insensitively by `e.key`.
 * Special names: 'Enter', 'Escape', ' ' (space), 'ArrowUp', etc.
 *
 * By default typing keys still fire even when an input is focused (the study
 * screen needs Enter/Escape while typing); pass `ignoreWhenTyping` for
 * shortcuts that must not steal keystrokes from text fields.
 */
export function useHotkeys(
  map: HotkeyMap,
  opts: { enabled?: boolean; ignoreWhenTyping?: string[] } = {},
): void {
  const { enabled = true, ignoreWhenTyping = [] } = opts;
  const mapRef = useRef(map);
  mapRef.current = map;

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const handler = mapRef.current[key];
      if (!handler) return;
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);
      if (typing && ignoreWhenTyping.includes(key)) return;
      handler(e);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ignoreWhenTyping.join(',')]);
}
