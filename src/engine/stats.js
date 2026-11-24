import { STATE } from './fsrs.js';
import { dayStart } from './queue.js';

const DAY_MS = 864e5;
const langOf = id => id.slice(0, id.indexOf(':'));

// Review entries that still count: not undone, not before a reset of their language.
function countedReviews(entries) {
  const undone = new Set(entries.filter(e => e.type === 'undo').map(e => e.target));
  const resetAt = new Map();
  for (const e of entries) {
    if (e.type === 'reset' && !(resetAt.get(e.lang) >= e.at)) resetAt.set(e.lang, e.at);
  }
  return entries.filter(e => e.type === 'review' && !undone.has(e.id)
    && !(resetAt.has(langOf(e.card)) && e.at <= resetAt.get(langOf(e.card))));
}

export function reviewsToday(entries, now, startHour = 4) {
  const start = dayStart(now, startHour).getTime();
  return countedReviews(entries).filter(e => new Date(e.at).getTime() >= start).length;
}

export function streak(entries, now, startHour = 4) {
  const days = new Set(countedReviews(entries).map(e => dayStart(new Date(e.at), startHour).getTime()));
  let d = dayStart(now, startHour);
  if (!days.has(d.getTime())) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(d.getTime())) {
    n++;
    d = new Date(d.getTime());
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export function retention30(entries, prevState, now) {
  const since = now.getTime() - 30 * DAY_MS;
  let total = 0, good = 0;
  for (const e of entries) {
    if (e.type !== 'review' || prevState.get(e.id) !== STATE.review) continue;
    if (new Date(e.at).getTime() < since) continue;
    total++;
    if (e.rating >= 2) good++;
  }
  return total ? good / total : null;
}

export function forecast(states, now, days = 7, startHour = 4) {
  const bounds = [];
  const d = dayStart(now, startHour);
  for (let i = 0; i < days; i++) {
    d.setDate(d.getDate() + 1);
    bounds.push(d.getTime());
  }
  const out = new Array(days).fill(0);
  for (const card of states.values()) {
    if (card.state === STATE.new) continue;
    const due = card.due.getTime();
    const i = bounds.findIndex(b => due < b);
    if (i >= 0) out[i]++;
  }
  return out;
}
