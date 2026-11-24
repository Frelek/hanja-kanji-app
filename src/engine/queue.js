import { STATE } from './fsrs.js';

export const NEW_EVERY = 4;
const LEECH_LAPSES = 8;

// Start of the current study day in local time (today at h:00, or yesterday if before h:00).
export function dayStart(now, startHour = 4) {
  const d = new Date(now.getTime());
  d.setHours(startHour, 0, 0, 0);
  if (now.getTime() < d.getTime()) d.setDate(d.getDate() - 1);
  return d;
}

// Start of the next study day; calendar-day arithmetic so DST is respected.
export function nextDayStart(now, startHour = 4) {
  const d = dayStart(now, startHour);
  d.setDate(d.getDate() + 1);
  return d;
}

export function introducedSet(states) {
  const set = new Set();
  for (const [id, card] of states) if (card.reps > 0) set.add(id);
  return set;
}

export function isAvailable(char, introduced) {
  return (char.required ?? []).every(id => introduced.has(id));
}

export function isLeech(card) {
  return card.lapses >= LEECH_LAPSES;
}

export function buildQueue({ chars, states, prevState, entries, settings, now }) {
  const startHour = settings.dayStartHour ?? 4;
  const start = dayStart(now, startHour).getTime();
  const end = nextDayStart(now, startHour).getTime();
  const byId = new Map(chars.map(c => [c.id, c]));
  const introduced = introducedSet(states);

  let newToday = 0, reviewsDone = 0;
  for (const e of entries) {
    if (e.type !== 'review' || !prevState.has(e.id)) continue;
    if (new Date(e.at).getTime() < start) continue;
    const prev = prevState.get(e.id);
    if (prev === STATE.new) newToday++;
    else if (prev === STATE.review) reviewsDone++;
  }

  const freshLimit = Math.max(0, settings.newPerDay - newToday);
  const fresh = chars
    .filter(c => !introduced.has(c.id) && isAvailable(c, introduced))
    .sort((a, b) => a.order - b.order)
    .slice(0, freshLimit)
    .map(c => ({ id: c.id, char: c }));

  const learning = [], review = [];
  for (const [id, card] of states) {
    const char = byId.get(id);
    if (!char || card.due.getTime() >= end) continue;
    if (card.state === STATE.learning || card.state === STATE.relearning) learning.push({ id, char });
    else if (card.state === STATE.review) review.push({ id, char });
  }
  const dueOf = it => states.get(it.id).due.getTime();
  learning.sort((a, b) => dueOf(a) - dueOf(b));
  review.sort((a, b) => dueOf(a) - dueOf(b));
  review.length = Math.min(review.length, Math.max(0, settings.maxReviews - reviewsDone));

  return {
    learning, review, fresh,
    counts: { new: fresh.length, learning: learning.length, review: review.length },
  };
}

export function nextItem(queue, states, now, doneSinceNew) {
  const t = now.getTime();
  const dueOf = it => states.get(it.id).due.getTime();
  const learning = [...queue.learning].sort((a, b) => dueOf(a) - dueOf(b));
  if (learning.length && dueOf(learning[0]) <= t) return { item: learning[0], waitMs: 0 };
  if (queue.fresh.length && (doneSinceNew >= NEW_EVERY || queue.review.length === 0)) {
    return { item: queue.fresh[0], waitMs: 0 };
  }
  if (queue.review.length) return { item: queue.review[0], waitMs: 0 };
  if (queue.fresh.length) return { item: queue.fresh[0], waitMs: 0 };
  return { item: null, waitMs: learning.length ? dueOf(learning[0]) - t : null };
}

export function buildPractice(levelId, chars, introduced, rng = Math.random) {
  const ids = chars.filter(c => c.level === levelId && introduced.has(c.id)).map(c => c.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids;
}
