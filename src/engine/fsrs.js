import { fsrs, generatorParameters, createEmptyCard } from '../../vendor/ts-fsrs.mjs';

export const RATING = { again: 1, hard: 2, good: 3, easy: 4 };
export const STATE = { new: 0, learning: 1, review: 2, relearning: 3 };

export function newCard(now) {
  return createEmptyCard(now);
}

export function formatInterval(ms) {
  const MIN = 60e3, HOUR = 36e5, DAY = 864e5;
  if (ms < MIN) return '<1m';
  if (ms < HOUR) return Math.round(ms / MIN) + 'm';
  if (ms < DAY) return Math.round(ms / HOUR) + 'h';
  const days = ms / DAY;
  if (days < 30) return Math.round(days) + 'd';
  if (days < 365) return Math.round(days / 30) + 'mo';
  const years = days / 365;
  return (years < 10 ? Math.round(years * 10) / 10 : Math.round(years)) + 'y';
}

export function makeScheduler(s) {
  const f = fsrs(generatorParameters({
    request_retention: s.retention,
    enable_fuzz: true,
    learning_steps: s.learningSteps,
    relearning_steps: s.relearningSteps,
  }));
  return {
    preview(card, now) {
      const rec = f.repeat(card, now);
      const out = {};
      for (const r of [1, 2, 3, 4]) {
        const due = rec[r].card.due;
        out[r] = { due, label: formatInterval(due.getTime() - now.getTime()) };
      }
      return out;
    },
    next(card, rating, now) {
      return f.next(card, now, rating).card;
    },
  };
}

/** The languages of card ids ("ja:<char>", "ko:<char>"). */
export const LANGS = ['ja', 'ko'];
const KNOWN = new Set(LANGS);

const langOf = id => id.slice(0, id.indexOf(':'));

// A review or reset of a language this version does not know (say, one a newer version
// added on another device) is skipped, not scheduled: there are no settings for it.
const known = e => (e.type === 'review' ? KNOWN.has(langOf(String(e.card)))
  : e.type === 'reset' ? KNOWN.has(e.lang) : true);

const sortEntries = entries => [...entries].filter(known).sort((a, b) =>
  a.at < b.at ? -1 : a.at > b.at ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

// Ids of review entries that count: not undone and not wiped by a later
// same-language reset, using the (at, id) order replay uses.
export function countedIds(entries) {
  const sorted = sortEntries(entries);
  const undone = new Set(sorted.filter(e => e.type === 'undo').map(e => e.target));
  const ids = new Set();
  const byLang = new Map();
  for (const e of sorted) {
    if (e.type === 'reset') {
      for (const id of byLang.get(e.lang) ?? []) ids.delete(id);
      byLang.delete(e.lang);
    } else if (e.type === 'review' && !undone.has(e.id)) {
      ids.add(e.id);
      const lang = langOf(e.card);
      if (!byLang.has(lang)) byLang.set(lang, []);
      byLang.get(lang).push(e.id);
    }
  }
  return ids;
}

export function replay(entries, settingsFor) {
  const sorted = sortEntries(entries);
  const counted = countedIds(entries);
  const states = new Map();
  const prevState = new Map();
  const schedulers = new Map();
  const schedFor = lang => {
    if (!schedulers.has(lang)) schedulers.set(lang, makeScheduler(settingsFor(lang)));
    return schedulers.get(lang);
  };
  for (const e of sorted) {
    if (e.type === 'reset') {
      for (const id of [...states.keys()]) if (langOf(id) === e.lang) states.delete(id);
    } else if (e.type === 'review' && counted.has(e.id)) {
      const lang = langOf(e.card);
      const at = new Date(e.at);
      const card = states.get(e.card) ?? newCard(at);
      prevState.set(e.id, card.state);
      states.set(e.card, schedFor(lang).next(card, e.rating, at));
    }
  }
  return { states, prevState };
}
