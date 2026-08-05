/**
 * UI-chrome translations (English / Dutch). This covers navigation, page
 * headers, and the most visible labels across the app — not every deep-modal
 * microcopy string. Falls back to the key itself if a translation is missing,
 * so nothing ever renders blank.
 */

export type Locale = 'en' | 'nl';

const STRINGS: Record<string, { en: string; nl: string }> = {
  // Nav
  'nav.dashboard': { en: 'Dashboard', nl: 'Dashboard' },
  'nav.stories': { en: 'Stories', nl: 'Verhalen' },
  'nav.statistics': { en: 'Statistics', nl: 'Statistieken' },
  'nav.settings': { en: 'Settings', nl: 'Instellingen' },

  // Dashboard
  'dashboard.title': { en: 'Dashboard', nl: 'Dashboard' },
  'dashboard.subtitle.studied': { en: "You've studied today — nice.", nl: 'Je hebt vandaag al geoefend — mooi zo.' },
  'dashboard.subtitle.pick': { en: 'Pick a list and keep your streak alive.', nl: 'Kies een lijst en houd je reeks levend.' },
  'dashboard.due.none': { en: 'Nothing due — study ahead?', nl: 'Niets te doen — vast vooruit oefenen?' },
  'dashboard.due.some': { en: 'words are due.', nl: 'woorden zijn aan de beurt.' },
  'dashboard.pickList': { en: 'Pick a list', nl: 'Kies een lijst' },
  'dashboard.studyAllDue': { en: 'Study all due', nl: 'Oefen alles' },
  'dashboard.newList': { en: 'New list', nl: 'Nieuwe lijst' },
  'dashboard.newFolder': { en: 'New folder', nl: 'Nieuwe map' },
  'dashboard.import': { en: 'Import CSV, Excel or paste', nl: 'Importeer CSV, Excel of plak tekst' },
  'dashboard.storedLocally': { en: 'Stored on this device only', nl: 'Alleen op dit apparaat opgeslagen' },
  'dashboard.restore': { en: 'Restore', nl: 'Herstellen' },
  'dashboard.backup': { en: 'Backup', nl: 'Back-up' },
  'dashboard.col.list': { en: 'List', nl: 'Lijst' },
  'dashboard.col.words': { en: 'Words', nl: 'Woorden' },
  'dashboard.col.due': { en: 'Due', nl: 'Te doen' },
  'dashboard.col.mastery': { en: 'Mastery', nl: 'Beheersing' },
  'dashboard.col.lastStudied': { en: 'Last studied', nl: 'Laatst geoefend' },
  'dashboard.empty.title': { en: 'No lists here yet', nl: 'Nog geen lijsten hier' },
  'dashboard.empty.desc': { en: 'Create a list or import words from CSV, Excel, or a paste.', nl: 'Maak een lijst of importeer woorden uit CSV, Excel of geplakte tekst.' },
  'dashboard.search.placeholder': { en: 'Search your lists…', nl: 'Zoek in je lijsten…' },
  'dashboard.allLevels': { en: 'All levels', nl: 'Alle niveaus' },
  'dashboard.onlyDue': { en: 'Only due', nl: 'Alleen te doen' },
  'dashboard.expandAll': { en: 'Expand all', nl: 'Alles uitklappen' },
  'dashboard.collapseAll': { en: 'Collapse all', nl: 'Alles inklappen' },
  'dashboard.noMatches': { en: 'No lists match your filters.', nl: 'Geen lijsten voldoen aan je filters.' },
  'dashboard.clearFilters': { en: 'Clear filters', nl: 'Filters wissen' },

  // Stories
  'stories.title': { en: 'Stories', nl: 'Verhalen' },
  'stories.subtitle': { en: 'Read short stories from A1 to C1, then test yourself on the vocabulary, content and subject.', nl: 'Lees korte verhalen van A1 tot C1 en test daarna je woordenschat, inhoud en onderwerp.' },
  'stories.readSoFar': { en: "You've read", nl: 'Je hebt' },
  'stories.soFar': { en: 'so far.', nl: 'gelezen tot nu toe.' },
  'stories.allLevels': { en: 'All levels', nl: 'Alle niveaus' },
  'stories.allLanguages': { en: 'All languages', nl: 'Alle talen' },
  'stories.story': { en: 'story', nl: 'verhaal' },
  'stories.stories': { en: 'stories', nl: 'verhalen' },
  'stories.empty': { en: 'No stories at this level yet', nl: 'Nog geen verhalen op dit niveau' },
  'stories.backToStories': { en: 'Back to stories', nl: 'Terug naar verhalen' },
  'stories.keyVocabulary': { en: 'Key vocabulary', nl: 'Belangrijke woorden' },
  'stories.notQuizzed': { en: 'Not quizzed yet', nl: 'Nog niet getoetst' },
  'stories.bestScore': { en: 'Best quiz score', nl: 'Beste score' },
  'stories.takeQuiz': { en: 'Take the quiz', nl: 'Doe de toets' },
  'stories.tipSelect': { en: 'Tip: select any word or phrase below to add it to one of your lists.', nl: 'Tip: selecteer een woord of zin hieronder om toe te voegen aan een van je lijsten.' },
  'stories.addToList': { en: 'Add to list', nl: 'Toevoegen aan lijst' },
  'stories.readAgain': { en: 'Read again', nl: 'Opnieuw lezen' },
  'stories.retakeQuiz': { en: 'Retake quiz', nl: 'Toets opnieuw doen' },
  'stories.questionsToRevisit': { en: 'Questions to revisit', nl: 'Vragen om te herzien' },
  'stories.backToStory': { en: 'Back to story', nl: 'Terug naar verhaal' },
  'stories.nextQuestion': { en: 'Next question', nl: 'Volgende vraag' },
  'stories.seeResults': { en: 'See results', nl: 'Bekijk resultaten' },

  // Study screen
  'study.translate': { en: 'Translate', nl: 'Vertaal' },
  'study.typeTarget': { en: 'Type in the target language', nl: 'Typ in de doeltaal' },
  'study.mistakeReview': { en: 'Mistake review', nl: 'Foutenherziening' },
  'study.exit': { en: 'Exit', nl: 'Afsluiten' },
  'study.submit': { en: 'Submit', nl: 'Versturen' },
  'study.hint': { en: 'Hint', nl: 'Hint' },
  'study.skip': { en: 'Skip', nl: 'Overslaan' },
  'study.continue': { en: 'Continue', nl: 'Doorgaan' },
  'study.correct': { en: 'Correct', nl: 'Juist' },
  'study.incorrect': { en: 'Incorrect', nl: 'Onjuist' },
  'study.yourAnswer': { en: 'Your answer', nl: 'Jouw antwoord' },
  'study.correctAnswer': { en: 'Correct answer', nl: 'Juiste antwoord' },
  'study.veryClose': { en: 'Very close — count it as correct?', nl: 'Heel dichtbij — toch goedkeuren?' },
  'study.howConfident': { en: 'How confident were you?', nl: 'Hoe zeker was je?' },
  'study.backToList': { en: 'Back to list', nl: 'Terug naar lijst' },

  // Session report
  'report.sessionComplete': { en: 'Session complete', nl: 'Sessie voltooid' },
  'report.reviewComplete': { en: 'Review complete', nl: 'Herziening voltooid' },
  'report.firstTry': { en: 'first try.', nl: 'in één keer goed.' },
  'report.goodWork': { en: 'good work.', nl: 'goed gedaan.' },
  'report.wordsToReview': { en: 'Words to review', nl: 'Woorden om te herzien' },
  'report.reviewMistakes': { en: 'Review mistakes', nl: 'Fouten herzien' },
  'report.studyAgain': { en: 'Study again', nl: 'Opnieuw oefenen' },
  'report.backToList': { en: 'Back to list', nl: 'Terug naar lijst' },

  // Statistics
  'stats.title': { en: 'Statistics', nl: 'Statistieken' },
  'stats.studyTime': { en: 'Study time', nl: 'Studietijd' },
  'stats.answers': { en: 'Answers', nl: 'Antwoorden' },
  'stats.wordsLearned': { en: 'Words learned', nl: 'Geleerde woorden' },
  'stats.mastered': { en: 'Mastered', nl: 'Beheerst' },
  'stats.studyActivity': { en: 'Study activity', nl: 'Studieactiviteit' },
  'stats.accuracyOverTime': { en: 'Accuracy over time', nl: 'Nauwkeurigheid in de tijd' },
  'stats.studyMinutes': { en: 'Study minutes · last 14 days', nl: 'Studieminuten · laatste 14 dagen' },
  'stats.mostDifficult': { en: 'Most difficult words', nl: 'Moeilijkste woorden' },
  'stats.strongestWeakest': { en: 'Strongest & weakest lists', nl: 'Sterkste & zwakste lijsten' },
  'stats.empty.title': { en: 'No study data yet', nl: 'Nog geen studiegegevens' },
  'stats.empty.desc': { en: 'Complete a study session and your progress, accuracy, and streaks will show up here.', nl: 'Rond een studiesessie af en je voortgang, nauwkeurigheid en reeksen verschijnen hier.' },

  // Settings
  'settings.title': { en: 'Settings', nl: 'Instellingen' },
  'settings.appearance': { en: 'Appearance', nl: 'Weergave' },
  'settings.studyDefaults': { en: 'Study defaults', nl: 'Standaardinstellingen' },
  'settings.answerChecking': { en: 'Answer checking', nl: 'Antwoordcontrole' },
  'settings.data': { en: 'Data', nl: 'Gegevens' },
};

export function translate(locale: Locale, key: string): string {
  const entry = STRINGS[key];
  if (!entry) return key;
  return entry[locale];
}
