/**
 * Import parsing. Turns pasted text / CSV / JSON / Excel into a list of word
 * drafts. All parsers return the same `ParsedWord[]` shape so the import UI is
 * format-agnostic. Excel parsing uses SheetJS, loaded lazily so it doesn't bloat
 * the main bundle.
 */

import { z } from 'zod';
import type { Word } from '@/types';

export type ParsedWord = Partial<Word> & { foreign: string; native: string };

export interface ParseResult {
  words: ParsedWord[];
  errors: string[];
}

/* ------------------------------ delimited text --------------------------- */

/** Detect the most likely column delimiter from a sample. */
function detectDelimiter(sample: string): string {
  const candidates = ['\t', ';', ',', '|', ' - ', '='];
  let best = '\t';
  let bestScore = -1;
  for (const d of candidates) {
    // Count lines that contain the delimiter; prefer the most consistent one.
    const lines = sample.split(/\r?\n/).filter(Boolean).slice(0, 20);
    const withDelim = lines.filter((l) => l.includes(d)).length;
    if (withDelim > bestScore) {
      bestScore = withDelim;
      best = d;
    }
  }
  return best;
}

/** Minimal CSV field splitter that respects double-quotes. */
function splitCsvLine(line: string, delimiter: string): string[] {
  if (delimiter.length > 1) return line.split(delimiter);
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQuotes = false;
      } else cur += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

const HEADER_ALIASES: Record<string, keyof ParsedWord> = {
  foreign: 'foreign',
  word: 'foreign',
  term: 'foreign',
  front: 'foreign',
  native: 'native',
  translation: 'native',
  meaning: 'native',
  back: 'native',
  example: 'exampleSentence',
  sentence: 'exampleSentence',
  examplesentence: 'exampleSentence',
  sentencetranslation: 'sentenceTranslation',
  notes: 'notes',
  note: 'notes',
  tags: 'tags',
  category: 'category',
  difficulty: 'difficulty',
};

/**
 * Parse pasted/CSV/TSV text. Two columns minimum (foreign, native). If the
 * first row looks like a header we map columns by name; otherwise positional.
 */
export function parseDelimited(text: string, forcedDelimiter?: string): ParseResult {
  const errors: string[] = [];
  const clean = text.replace(/\r\n/g, '\n').trim();
  if (!clean) return { words: [], errors: ['Nothing to import.'] };

  const delimiter = forcedDelimiter ?? detectDelimiter(clean);
  const rows = clean
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => splitCsvLine(l, delimiter));

  // Header detection: first row has known header names & no obvious data.
  const firstLower = rows[0].map((c) => c.toLowerCase().replace(/\s+/g, ''));
  const looksLikeHeader = firstLower.some((c) => c in HEADER_ALIASES);
  let colMap: (keyof ParsedWord | null)[] = [];
  let dataRows = rows;

  if (looksLikeHeader) {
    colMap = firstLower.map((c) => HEADER_ALIASES[c] ?? null);
    dataRows = rows.slice(1);
  } else {
    colMap = ['foreign', 'native', 'exampleSentence', 'notes'];
  }

  const words: ParsedWord[] = [];
  dataRows.forEach((cols, idx) => {
    const draft: Record<string, unknown> = {};
    cols.forEach((val, i) => {
      const key = colMap[i];
      if (!key || !val) return;
      if (key === 'tags') draft[key] = val.split(/[,;]/).map((t) => t.trim()).filter(Boolean);
      else if (key === 'difficulty') draft[key] = Math.min(5, Math.max(1, Number(val) || 3));
      else draft[key] = val;
    });
    if (!draft.foreign || !draft.native) {
      // Skip silently if the row is blank-ish; report otherwise.
      if (cols.some(Boolean)) errors.push(`Row ${idx + 1}: needs both a word and a translation.`);
      return;
    }
    words.push(draft as ParsedWord);
  });

  return { words, errors };
}

/* ---------------------------------- JSON --------------------------------- */

const jsonWordSchema = z.object({
  foreign: z.string().min(1),
  native: z.string().min(1),
  foreignAlt: z.array(z.string()).optional(),
  nativeAlt: z.array(z.string()).optional(),
  exampleSentence: z.string().optional(),
  sentenceTranslation: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
  difficulty: z.number().int().min(1).max(5).optional(),
});

export function parseJson(text: string): ParseResult {
  try {
    const data = JSON.parse(text);
    const arr = Array.isArray(data) ? data : (data.words ?? []);
    const words: ParsedWord[] = [];
    const errors: string[] = [];
    arr.forEach((raw: unknown, i: number) => {
      const parsed = jsonWordSchema.safeParse(raw);
      if (parsed.success) words.push(parsed.data as ParsedWord);
      else errors.push(`Item ${i + 1}: ${parsed.error.issues[0]?.message ?? 'invalid'}`);
    });
    return { words, errors };
  } catch (e) {
    return { words: [], errors: [`Invalid JSON: ${(e as Error).message}`] };
  }
}

/* --------------------------------- Excel --------------------------------- */

export async function parseExcel(file: File): Promise<ParseResult> {
  const XLSX = await import('xlsx');
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  // Convert to CSV then reuse the delimited parser (handles headers uniformly).
  const csv = XLSX.utils.sheet_to_csv(sheet);
  return parseDelimited(csv, ',');
}

/** Dispatch by file extension. */
export async function parseFile(file: File): Promise<ParseResult> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.json')) return parseJson(await file.text());
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return parseExcel(file);
  return parseDelimited(await file.text());
}
