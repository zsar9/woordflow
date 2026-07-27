# WoordFlow

A fast, modern, **typing-first** vocabulary trainer — a spiritual successor to
Study2Go / WRTS / Woordjesleren, rebuilt with a premium interface and a serious
learning engine. Everything runs locally in your browser and works fully offline.

> The whole app is built around **active recall through typing**. You type the
> answer, press Enter, and keep moving — no flashcards, no clutter, no clicks.

## Highlights

- **Typing study mode** — large prompt, one input, instant validation, keyboard-only flow.
- **Intelligent answer checking** — ignores case, accents, punctuation, quotes,
  extra spaces and optional articles; accepts multiple answers and alternative
  spellings (color/colour); **fuzzy matching** (Levenshtein) flags near-misses so
  you can accept or reject them with `Y` / `N`.
- **Spaced repetition** — an SM-2-style scheduler tuned for typing, influenced by
  correctness, hints, response time and optional confidence ratings.
- **Hints & skip** — reveal letters progressively (`H`), skip and come back (`Tab`).
- **Mistake review** — every session can immediately re-drill just the words you missed.
- **Rich statistics** — per-word mastery/difficulty, session reports, accuracy over
  time, a study heatmap, streaks, hardest words, list rankings.
- **Library** — nestable folders, lists, inline editing, search, duplicate/merge.
- **Import / export** — CSV, TSV, Excel (.xlsx), JSON, copy-paste, plus full backups.
- **Light / dark / system** themes, keyboard-first everywhere, offline-first (IndexedDB).

## Getting started

Requires Node 18+ (Node 20/22 recommended).

```bash
npm install
npm run dev      # start the dev server (Vite) — open the printed URL
```

Other scripts:

```bash
npm run build    # type-check + production build into dist/
npm run preview  # preview the production build
npm run test     # run the unit tests (Vitest) for the study engine
```

On first run the app seeds a few demo lists (Darija, French, Spanish) so you can
try studying immediately. Clear them any time from **Settings → Clear all data**.

## Keyboard shortcuts (study mode)

| Key | Action |
| --- | --- |
| `Enter` | Submit answer / continue |
| `Space` | Continue after an incorrect answer |
| `Tab` | Skip (returns later this session) |
| `H` | Hint (reveal a letter — only before you start typing; the 💡 button works any time) |
| `Y` / `N` | On a near-miss: count as correct / incorrect |
| `1`–`5` | Confidence rating (when enabled) |
| `Esc` | End the session |
| `⌘/Ctrl + K` | Global search |

## How answer checking works

Answers are normalized before comparison (configurable in Settings): lower-cased,
accents stripped, punctuation removed, whitespace collapsed, optional leading
articles dropped. Each entry can define **multiple accepted answers** (comma /
semicolon / slash separated, or via the alt-answer fields) and **alternative
spellings**. If your answer isn't an exact match but is within a small edit
distance (Strict / Balanced / Lenient), it's shown as a near-miss you can accept
or reject — so a single typo never silently marks you wrong.

## Tech

React 18 · TypeScript · Vite · Tailwind CSS · Framer Motion · React Router ·
Dexie (IndexedDB) · Zod · Recharts · SheetJS (xlsx).

## Architecture

```
src/
  types.ts                 # domain model (single source of truth)
  db/                      # Dexie schema + repository layer (all DB access)
  lib/                     # pure logic: text/normalize, validation, srs, import, export, format
  hooks/                   # theme, settings, global hotkeys
  components/ui/           # design-system primitives (Button, Modal, Toast, Icon, …)
  features/
    study/                 # the typing engine: queue builder, session engine, study screen
    dashboard/             # library, folder tree, list cards, global search
    lists/                 # word table + inline editing
    stats/                 # charts, heatmap, streaks
    import/                # import modal
  pages/                   # routed pages
  app/                     # router + app shell
```

The core learning logic (`lib/text.ts`, `lib/validation.ts`, `lib/srs.ts`,
`features/study/queue.ts`) is pure and unit-tested, independent of React and the
database, so it's easy to reason about and extend.

## Future-proofing

The data model already carries fields for `audioUrl` / `imageUrl` and the study
pipeline is structured so AI features (generated example sentences, multiple-choice
distractors, pronunciation scoring, OCR/vocab import, speech recognition,
translation suggestions) can be added as new services without touching the core.

## Data & privacy

Everything is stored locally in your browser via IndexedDB — nothing leaves your
device. Use **Settings → Download backup** regularly; restore or migrate with
**Restore backup**.
