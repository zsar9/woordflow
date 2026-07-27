import type * as React from 'react';
import { useRef, useState } from 'react';
import { useSettings } from '@/hooks/useSettings';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { inputClass } from '@/components/ui/primitives';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { downloadBackup, restoreBackup } from '@/lib/export';
import { db } from '@/db/db';
import { useToast } from '@/components/ui/Toast';
import {
  QUESTION_ORDER_LABELS,
  type Direction,
  type ForgivenessLevel,
  type QuestionOrder,
} from '@/types';

export function SettingsPage() {
  const { settings, update } = useSettings();
  const { mode } = useTheme();
  const toast = useToast();
  const restoreRef = useRef<HTMLInputElement>(null);
  const [showReset, setShowReset] = useState(false);

  const handleRestore = async (file: File) => {
    try {
      await restoreBackup(await file.text());
      toast.push('Backup restored — reload to see everything', 'success');
    } catch (e) {
      toast.push((e as Error).message, 'danger');
    }
  };

  const wipe = async () => {
    await Promise.all([
      db.folders.clear(),
      db.lists.clear(),
      db.words.clear(),
      db.stats.clear(),
      db.sessions.clear(),
      db.activity.clear(),
    ]);
    setShowReset(false);
    toast.push('All study data cleared');
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-ink">Settings</h1>

      <Section title="Appearance">
        <Row label="Theme" hint={`Currently: ${mode}`}>
          <ThemeToggle />
        </Row>
      </Section>

      <Section title="Study defaults">
        <Row label="Default direction">
          <select
            className={inputClass + ' max-w-[220px]'}
            value={settings.defaultDirection}
            onChange={(e) => update({ defaultDirection: e.target.value as Direction | 'mixed' })}
          >
            <option value="foreign-to-native">Foreign → Native</option>
            <option value="native-to-foreign">Native → Foreign</option>
            <option value="mixed">Mixed</option>
          </select>
        </Row>
        <Row label="Default order">
          <select
            className={inputClass + ' max-w-[220px]'}
            value={settings.defaultOrder}
            onChange={(e) => update({ defaultOrder: e.target.value as QuestionOrder })}
          >
            {(Object.keys(QUESTION_ORDER_LABELS) as QuestionOrder[]).map((o) => (
              <option key={o} value={o}>
                {QUESTION_ORDER_LABELS[o]}
              </option>
            ))}
          </select>
        </Row>
        <Row label="Default question count">
          <select
            className={inputClass + ' max-w-[220px]'}
            value={String(settings.defaultCount)}
            onChange={(e) =>
              update({
                defaultCount: e.target.value === 'all' ? 'all' : Number(e.target.value),
              })
            }
          >
            {['10', '20', '50', '100', 'all'].map((c) => (
              <option key={c} value={c}>
                {c === 'all' ? 'All' : c}
              </option>
            ))}
          </select>
        </Row>
        <Row label="Auto-advance delay" hint="Milliseconds after a correct answer">
          <input
            type="number"
            min={150}
            max={2000}
            step={50}
            className={inputClass + ' max-w-[120px]'}
            value={settings.autoAdvanceMs}
            onChange={(e) => update({ autoAdvanceMs: Number(e.target.value) })}
          />
        </Row>
      </Section>

      <Section title="Answer checking">
        <ToggleRow
          label="Fuzzy matching"
          hint="Detect near-miss typos and let you confirm them"
          checked={settings.enableFuzzy}
          onChange={(v) => update({ enableFuzzy: v })}
        />
        <Row label="Typing forgiveness">
          <select
            className={inputClass + ' max-w-[180px]'}
            value={settings.forgiveness}
            onChange={(e) => update({ forgiveness: e.target.value as ForgivenessLevel })}
          >
            <option value="strict">Strict</option>
            <option value="balanced">Balanced</option>
            <option value="lenient">Lenient</option>
          </select>
        </Row>
        <ToggleRow
          label="Hints"
          hint="Allow revealing letters with H (slightly lowers the score)"
          checked={settings.enableHints}
          onChange={(v) => update({ enableHints: v })}
        />
        <ToggleRow
          label="Ask confidence"
          hint="After each correct answer, rate how sure you were"
          checked={settings.askConfidence}
          onChange={(v) => update({ askConfidence: v })}
        />
        <ToggleRow
          label="Ignore accents"
          checked={settings.ignoreAccents}
          onChange={(v) => update({ ignoreAccents: v })}
        />
        <ToggleRow
          label="Ignore punctuation"
          checked={settings.ignorePunctuation}
          onChange={(v) => update({ ignorePunctuation: v })}
        />
        <ToggleRow
          label="Ignore optional articles"
          hint="Accept answers with or without the / le / la / de …"
          checked={settings.ignoreArticles}
          onChange={(v) => update({ ignoreArticles: v })}
        />
      </Section>

      <Section title="Data">
        <input
          ref={restoreRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleRestore(f);
          }}
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => void downloadBackup()}>
            <Icon.Export size={15} /> Download backup
          </Button>
          <Button variant="secondary" onClick={() => restoreRef.current?.click()}>
            <Icon.Import size={15} /> Restore backup
          </Button>
          <Button variant="ghost" onClick={() => setShowReset(true)}>
            <Icon.Trash size={15} /> Clear all data
          </Button>
        </div>
        <p className="mt-2 text-xs text-subtle">
          Everything is stored locally in your browser (IndexedDB) and works offline. Back up
          regularly if this data matters to you.
        </p>
      </Section>

      <Modal
        open={showReset}
        onClose={() => setShowReset(false)}
        title="Clear all data?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowReset(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={wipe}>
              Clear everything
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          This permanently deletes all folders, lists, words, statistics, and history from this
          browser. Consider downloading a backup first.
        </p>
      </Modal>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-subtle">
        {title}
      </h2>
      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
        {children}
      </div>
    </div>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <div className="text-sm font-medium text-ink">{label}</div>
        {hint && <div className="text-xs text-subtle">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Row label={label} hint={hint}>
      <button
        onClick={() => onChange(!checked)}
        className={
          'relative h-6 w-11 rounded-full transition ' +
          (checked ? 'bg-brand' : 'bg-elevated')
        }
        role="switch"
        aria-checked={checked}
      >
        <span
          className={
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ' +
            (checked ? 'left-[22px]' : 'left-0.5')
          }
        />
      </button>
    </Row>
  );
}
