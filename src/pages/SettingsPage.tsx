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
import { forgetCurriculumInstall, resetCurriculum } from '@/features/curriculum/install';
import type { Direction } from '@/types';

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

  const reinstall = async () => {
    try {
      const r = await resetCurriculum();
      toast.push(`Curriculum reinstalled — ${r.installedLists} lists`, 'success');
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
    // The curriculum went with it — let it reinstall on the next load.
    forgetCurriculumInstall();
    setShowReset(false);
    toast.push('All study data cleared — reload to reinstall the curriculum');
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
        <Row
          label="Auto-advance delay"
          hint="Milliseconds a correct answer stays on screen"
        >
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

      <Section title="How quizzing works">
        <Row label="Every word, every time" hint="Sessions always cover the whole list, in random order" />
        <Row label="Balanced answer checking" hint="Case, accents and punctuation are ignored; near-misses are flagged" />
        <Row label="You have the final say" hint="Press Y on any answer the checker marked wrong to overrule it" />
        <Row label="Nothing gets away" hint="Wrong answers and postponed words are asked again before the session ends" />
        <Row label="Hints always available" hint="Press ? to reveal letters one at a time" />
      </Section>

      <Section title="Curriculum">
        <Row
          label="Reinstall the built-in curriculum"
          hint="Restores the Spanish and Darija lists. Your own lists are untouched; progress on curriculum lists is reset."
        >
          <Button variant="secondary" onClick={() => void reinstall()}>
            <Icon.Import size={15} /> Reinstall
          </Button>
        </Row>
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
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <div className="text-sm font-medium text-ink">{label}</div>
        {hint && <div className="text-xs text-subtle">{hint}</div>}
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
}
