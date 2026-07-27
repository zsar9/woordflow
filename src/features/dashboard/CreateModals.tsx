import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, inputClass } from '@/components/ui/primitives';
import { createFolder, createList } from '@/db/repo';
import { WORD_CATEGORIES, type Folder, type WordCategory } from '@/types';
import { useToast } from '@/components/ui/Toast';

export function NewListModal({
  open,
  onClose,
  folders,
  defaultFolderId,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  folders: Folder[];
  defaultFolderId: string | null;
  onCreated: (id: string) => void;
}) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [language, setLanguage] = useState('');
  const [nativeLanguage, setNativeLanguage] = useState('English');
  const [folderId, setFolderId] = useState<string | null>(defaultFolderId);
  const [category, setCategory] = useState<WordCategory>('vocabulary');

  const submit = async () => {
    if (!name.trim()) {
      toast.push('Give the list a name', 'danger');
      return;
    }
    const list = await createList({
      name: name.trim(),
      language: language.trim() || 'Unknown',
      nativeLanguage: nativeLanguage.trim() || 'English',
      folderId,
      category,
    });
    toast.push('List created', 'success');
    setName('');
    setLanguage('');
    onCreated(list.id);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New list"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit}>
            Create list
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Name">
          <input
            autoFocus
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Spanish — Food & Drink"
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Language (learning)">
            <input
              className={inputClass}
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              placeholder="Spanish"
            />
          </Field>
          <Field label="Your language">
            <input
              className={inputClass}
              value={nativeLanguage}
              onChange={(e) => setNativeLanguage(e.target.value)}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Folder">
            <select
              className={inputClass}
              value={folderId ?? ''}
              onChange={(e) => setFolderId(e.target.value || null)}
            >
              <option value="">No folder</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Category">
            <select
              className={inputClass}
              value={category}
              onChange={(e) => setCategory(e.target.value as WordCategory)}
            >
              {WORD_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c[0].toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>
    </Modal>
  );
}

export function NewFolderModal({
  open,
  onClose,
  folders,
  defaultParentId,
}: {
  open: boolean;
  onClose: () => void;
  folders: Folder[];
  defaultParentId: string | null;
}) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [parentId, setParentId] = useState<string | null>(defaultParentId);

  const submit = async () => {
    if (!name.trim()) return;
    await createFolder({ name: name.trim(), icon: icon.trim() || undefined, parentId });
    toast.push('Folder created', 'success');
    setName('');
    setIcon('');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New folder"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit}>
            Create folder
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-[64px_1fr] gap-3">
          <Field label="Icon">
            <input
              className={inputClass + ' text-center'}
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="📁"
              maxLength={2}
            />
          </Field>
          <Field label="Name">
            <input
              autoFocus
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. French"
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
          </Field>
        </div>
        <Field label="Parent folder">
          <select
            className={inputClass}
            value={parentId ?? ''}
            onChange={(e) => setParentId(e.target.value || null)}
          >
            <option value="">Top level</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </Modal>
  );
}
