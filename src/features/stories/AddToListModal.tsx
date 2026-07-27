import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { createList, addWord } from '@/db/repo';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, inputClass } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';
import type { LanguageTag } from '@/types';

const NEW_LIST_VALUE = '__new__';

interface Props {
  open: boolean;
  onClose: () => void;
  foreign: string;
  suggestedNative?: string;
  language: LanguageTag;
  nativeLanguage: LanguageTag;
}

/** Small modal to save a selected word/phrase from a story into a study list. */
export function AddToListModal({
  open,
  onClose,
  foreign,
  suggestedNative,
  language,
  nativeLanguage,
}: Props) {
  const toast = useToast();
  const lists = useLiveQuery(
    () => db.lists.where('language').equals(language).toArray(),
    [language],
  );

  const [native, setNative] = useState(suggestedNative ?? '');
  const [listId, setListId] = useState('');
  const [newListName, setNewListName] = useState('');
  const [saving, setSaving] = useState(false);

  // Reset the form whenever a new word is opened.
  useEffect(() => {
    if (open) {
      setNative(suggestedNative ?? '');
      setNewListName('');
    }
  }, [open, suggestedNative]);

  // Default to the first matching list once one loads.
  useEffect(() => {
    if (!listId && lists && lists.length > 0) setListId(lists[0].id);
  }, [lists, listId]);

  const hasExistingLists = !!lists && lists.length > 0;
  const isNewList = !hasExistingLists || listId === NEW_LIST_VALUE;

  const save = async () => {
    const foreignTrimmed = foreign.trim();
    const nativeTrimmed = native.trim();
    if (!foreignTrimmed || !nativeTrimmed) return;
    setSaving(true);
    try {
      let targetId = listId;
      let targetName = lists?.find((l) => l.id === listId)?.name;
      if (isNewList) {
        const name = newListName.trim() || `${language} — from stories`;
        const created = await createList({
          name,
          language,
          nativeLanguage,
          category: 'vocabulary',
        });
        targetId = created.id;
        targetName = created.name;
      }
      await addWord(targetId, {
        foreign: foreignTrimmed,
        native: nativeTrimmed,
        notes: 'Added while reading a story',
      });
      toast.push(`Added "${foreignTrimmed}" to ${targetName ?? 'your list'}`, 'success');
      onClose();
    } catch (e) {
      toast.push((e as Error).message, 'danger');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add word to a list"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => void save()}
            disabled={saving || !native.trim() || !foreign.trim()}
          >
            Add word
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Word">
          <div className={cn(inputClass, 'select-text cursor-text bg-canvas')} dir="auto">
            {foreign}
          </div>
        </Field>
        <Field label="Translation" hint="Edit if the suggestion isn't quite right.">
          <input
            autoFocus
            value={native}
            onChange={(e) => setNative(e.target.value)}
            className={inputClass}
            placeholder="e.g. hello"
          />
        </Field>
        <Field label="List">
          <select
            value={hasExistingLists ? listId : NEW_LIST_VALUE}
            onChange={(e) => setListId(e.target.value)}
            className={inputClass}
          >
            {lists?.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
            <option value={NEW_LIST_VALUE}>+ Create new list…</option>
          </select>
        </Field>
        {isNewList && (
          <Field label="New list name">
            <input
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              className={inputClass}
              placeholder={`${language} — from stories`}
            />
          </Field>
        )}
      </div>
    </Modal>
  );
}
