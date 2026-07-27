/** A small hand-rolled icon set (stroke-based, inherits currentColor). */
import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };

function base(size = 18, props: P) {
  const { size: _s, ...rest } = props;
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    ...rest,
  };
}

export const Icon = {
  Home: (p: P) => (
    <svg {...base(p.size, p)}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></svg>
  ),
  Chart: (p: P) => (
    <svg {...base(p.size, p)}><path d="M4 20V4" /><path d="M4 20h16" /><rect x="7" y="11" width="3" height="6" /><rect x="13" y="7" width="3" height="10" /></svg>
  ),
  Settings: (p: P) => (
    <svg {...base(p.size, p)}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 6.6 19l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H2a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 3.2 6.6l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H8A1.6 1.6 0 0 0 9 2.6V2a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V8a1.6 1.6 0 0 0 1.4 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" /></svg>
  ),
  Play: (p: P) => (
    <svg {...base(p.size, p)}><path d="M7 4.5v15l12-7.5-12-7.5Z" fill="currentColor" stroke="none" /></svg>
  ),
  Plus: (p: P) => (
    <svg {...base(p.size, p)}><path d="M12 5v14M5 12h14" /></svg>
  ),
  Search: (p: P) => (
    <svg {...base(p.size, p)}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></svg>
  ),
  Folder: (p: P) => (
    <svg {...base(p.size, p)}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /></svg>
  ),
  Chevron: (p: P) => (
    <svg {...base(p.size, p)}><path d="m9 6 6 6-6 6" /></svg>
  ),
  Edit: (p: P) => (
    <svg {...base(p.size, p)}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
  ),
  Trash: (p: P) => (
    <svg {...base(p.size, p)}><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /></svg>
  ),
  Star: (p: P) => (
    <svg {...base(p.size, p)}><path d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19l1-5.8L3.5 9.2l5.9-.9Z" /></svg>
  ),
  Check: (p: P) => (
    <svg {...base(p.size, p)}><path d="M20 6 9 17l-5-5" /></svg>
  ),
  X: (p: P) => (
    <svg {...base(p.size, p)}><path d="M18 6 6 18M6 6l12 12" /></svg>
  ),
  Bulb: (p: P) => (
    <svg {...base(p.size, p)}><path d="M9 18h6" /><path d="M10 21h4" /><path d="M12 3a6 6 0 0 0-4 10.5c.6.6 1 1.3 1 2.1V16h6v-.4c0-.8.4-1.5 1-2.1A6 6 0 0 0 12 3Z" /></svg>
  ),
  Skip: (p: P) => (
    <svg {...base(p.size, p)}><path d="M5 5v14l8-7-8-7Z" fill="currentColor" stroke="none" /><path d="M19 5v14" /></svg>
  ),
  Import: (p: P) => (
    <svg {...base(p.size, p)}><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></svg>
  ),
  Export: (p: P) => (
    <svg {...base(p.size, p)}><path d="M12 21V9" /><path d="m7 14 5-5 5 5" /><path d="M5 3h14" /></svg>
  ),
  Sun: (p: P) => (
    <svg {...base(p.size, p)}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
  ),
  Moon: (p: P) => (
    <svg {...base(p.size, p)}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" /></svg>
  ),
  Monitor: (p: P) => (
    <svg {...base(p.size, p)}><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></svg>
  ),
  Flame: (p: P) => (
    <svg {...base(p.size, p)}><path d="M12 3c1 3-1 4-1 6a3 3 0 0 0 3 3c0-1 .5-2 1-2.5.8 1 2 2.6 2 4.5a5 5 0 1 1-10 0c0-3.5 3-4.5 3-8 0-2 1-4 2-6Z" /></svg>
  ),
  Back: (p: P) => (
    <svg {...base(p.size, p)}><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg>
  ),
  Copy: (p: P) => (
    <svg {...base(p.size, p)}><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>
  ),
  Book: (p: P) => (
    <svg {...base(p.size, p)}><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5Z" /><path d="M19 3v16" /></svg>
  ),
};
