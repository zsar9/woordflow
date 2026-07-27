import { useRef, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, inputClass } from '@/components/ui/primitives';
import { parseDelimited, parseFile, type ParsedWord } from '@/lib/import';
import { addWords, createList } from '@/db/repo';
import { useToast } from '@/components/ui/Toast';
import { Icon } from '@/components/ui/Icon';

interface Props {
  open: boolean;
  onClose: () => void;
  /** If provided, import into this list; otherwise a new list is created. */
  targetListId?: string;
  defaultLanguage?: string;
  onDone?: (count: number, listId: string) => void;
}

export function ImportModal({
  open,
  onClose,
  targetListId,
  defaultLanguage,
  onDone,
}: Props) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState<ParsedWord[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [listName, setListName] = useState('');
  const [language, setLanguage] = useState(defaultLanguage ?? '');
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setText('');
    setParsed([]);
    setErrors([]);
    setListName('');
  };

  const handleText = (value: string) => {
    setText(value);
    if (value.trim()) {
      const res = parseDelimited(value);
      setParsed(res.words);
      setErrors(res.errors);
    } else {
      setParsed([]);
      setErrors([]);
    }
  };

  const handleFile = async (file: File) => {
    const res = await parseFile(file);
    setParsed(res.words);
    setErrors(res.errors);
    if (!listName) setListName(file.name.replace(/\.[^.]+$/, ''));
  };

  const commit = async () => {
    if (parsed.length === 0) return;
    setBusy(true);
    try {
      let listId = targetListId;
      if (!listId) {
        const list = await createList({
          name: listName.trim() || 'Imported list',
          language: language.trim() || 'Unknown',
          nativeLanguage: 'English',
        });
        listId = list.id;
      }
      const count = await addWords(listId, parsed);
      toast.push(`Imported ${count} words`, 'success');
      onDone?.(count, listId);
      reset();
      onClose();
    } catch (e) {
      toast.push(`Import failed: ${(e as Error).message}`, 'danger');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Import words"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={commit} disabled={busy || parsed.length === 0}>
            Import {parsed.length > 0 ? `${parsed.length} words` : ''}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {!targetListId && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="List name">
              <input
                className={inputClass}
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                placeholder="e.g. French — Chapter 3"
              />
            </Field>
            <Field label="Language">
              <input
                className={inputClass}
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                placeholder="e.g. French"
              />
            </Field>
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.tsv,.txt,.json,.xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />
          <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
            <Icon.Import size={15} /> Choose file (CSV, Excel, JSON)
          </Button>
          <span className="text-xs text-subtle">or paste below</span>
        </div>

        <Field
          label="Paste words"
          hint="One pair per line. Separate columns with a Tab, comma, or semicolon. A header row is auto-detected."
        >
          <textarea
            className={inputClass + ' h-36 resize-y font-mono text-[13px]'}
            value={text}
            onChange={(e) => handleText(e.target.value)}
            placeholder={'kat\tcat\nhond\tdog\nvogel\tbird'}
          />
        </Field>

        {errors.length > 0 && (
          <div className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
            {errors.slice(0, 4).map((e, i) => (
              <div key={i}>{e}</div>
            ))}
            {errors.length > 4 && <div>+{errors.length - 4} more…</div>}
          </div>
        )}

        {parsed.length > 0 && (
          <div className="rounded-xl border border-border">
            <div className="border-b border-border px-3 py-2 text-xs font-medium text-muted">
              Preview — {parsed.length} words
            </div>
            <div className="max-h-48 overflow-y-auto">
              {parsed.slice(0, 30).map((w, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 border-b border-border/60 px-3 py-1.5 text-sm last:border-0"
                >
                  <span className="min-w-0 flex-1 truncate text-ink" dir="auto">
                    {w.foreign}
                  </span>
                  <span className="text-subtle">→</span>
                  <span className="min-w-0 flex-1 truncate text-muted" dir="auto">
                    {w.native}
                  </span>
                </div>
              ))}
              {parsed.length > 30 && (
                <div className="px-3 py-1.5 text-xs text-subtle">
                  +{parsed.length - 30} more…
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
