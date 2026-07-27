/**
 * First-run seed data so the app is explorable immediately. Runs once; guarded
 * by a flag row in settings-adjacent storage (we check if any list exists).
 */

import { db } from '@/db/db';
import { createFolder, createList, addWords } from '@/db/repo';
import type { ParsedWord } from './import';

const darija: ParsedWord[] = [
  { foreign: 'سلام', native: 'hello', notes: 'salam', exampleSentence: 'سلام، كيف داير؟', sentenceTranslation: 'Hello, how are you?' },
  { foreign: 'شكرا', native: 'thank you', notes: 'shukran' },
  { foreign: 'بغيت', native: 'I want', notes: 'bghit' },
  { foreign: 'كتاب', native: 'book', notes: 'ktab' },
  { foreign: 'ماء', native: 'water', notes: 'ma' },
  { foreign: 'خبز', native: 'bread', notes: 'khubz' },
  { foreign: 'كبير', native: 'big', notes: 'kbir' },
  { foreign: 'صغير', native: 'small', notes: 'sghir' },
  { foreign: 'اليوم', native: 'today', notes: 'lyoum' },
  { foreign: 'غدا', native: 'tomorrow', notes: 'ghedda' },
];

const french: ParsedWord[] = [
  { foreign: 'la maison', native: 'the house', foreignAlt: ['maison'] },
  { foreign: 'beau', native: 'beautiful, handsome', nativeAlt: ['pretty', 'good-looking'] },
  { foreign: 'manger', native: 'to eat', exampleSentence: "J'aime manger.", sentenceTranslation: 'I like to eat.' },
  { foreign: 'toujours', native: 'always' },
  { foreign: 'la couleur', native: 'the colour', nativeAlt: ['color'] },
  { foreign: 'vite', native: 'quickly, fast' },
  { foreign: "l'école", native: 'the school' },
  { foreign: 'apprendre', native: 'to learn' },
  { foreign: 'le mot', native: 'the word' },
  { foreign: 'demain', native: 'tomorrow' },
];

const spanish: ParsedWord[] = [
  { foreign: 'la casa', native: 'the house' },
  { foreign: 'hermoso', native: 'beautiful', nativeAlt: ['lovely'] },
  { foreign: 'comer', native: 'to eat' },
  { foreign: 'siempre', native: 'always' },
  { foreign: 'el color', native: 'the colour', nativeAlt: ['color'] },
  { foreign: 'rápido', native: 'fast, quick' },
  { foreign: 'la escuela', native: 'the school' },
  { foreign: 'aprender', native: 'to learn' },
  { foreign: 'la palabra', native: 'the word' },
  { foreign: 'mañana', native: 'tomorrow' },
];

export async function seedIfEmpty(): Promise<boolean> {
  const count = await db.lists.count();
  if (count > 0) return false;

  const languages = await createFolder({ name: 'Languages', icon: '🌍' });

  const darijaFolder = await createFolder({ name: 'Moroccan Darija', parentId: languages.id, icon: '🇲🇦' });
  const frenchFolder = await createFolder({ name: 'French', parentId: languages.id, icon: '🇫🇷' });
  const spanishFolder = await createFolder({ name: 'Spanish', parentId: languages.id, icon: '🇪🇸' });
  await createFolder({ name: 'Dutch', parentId: languages.id, icon: '🇳🇱' });
  await createFolder({ name: 'Arabic', parentId: languages.id, icon: '🇸🇦' });

  const d = await createList({
    name: 'Darija — Essentials',
    folderId: darijaFolder.id,
    language: 'Moroccan Darija',
    nativeLanguage: 'English',
    category: 'vocabulary',
  });
  await addWords(d.id, darija);

  const f = await createList({
    name: 'French — Starter Vocabulary',
    folderId: frenchFolder.id,
    language: 'French',
    nativeLanguage: 'English',
    category: 'vocabulary',
  });
  await addWords(f.id, french);

  const s = await createList({
    name: 'Spanish — Starter Vocabulary',
    folderId: spanishFolder.id,
    language: 'Spanish',
    nativeLanguage: 'English',
    category: 'vocabulary',
  });
  await addWords(s.id, spanish);

  return true;
}
