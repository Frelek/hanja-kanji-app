// Small display formatters shared by the Study screens.
import { dayStart } from '../engine/queue.js';

/** KANJIDIC marks okurigana with '.'; learners read it as a middle dot: 'やす.む' -> 'やす・む'. */
export const kunLabel = (kun) => String(kun).replaceAll('.', '・');

/** One Korean reading as it is said aloud: {hun:'쉴', eum:'휴'} -> '쉴 휴'. */
export const hunEumLabel = ({ hun, eum }) => `${hun} ${eum}`;

const SECONDS = { new: 20, learning: 10, review: 8 };

/** Rough length of a study session in whole minutes, rounded up. */
export function estimateMinutes(counts) {
  const s = (counts.new ?? 0) * SECONDS.new
    + (counts.learning ?? 0) * SECONDS.learning
    + (counts.review ?? 0) * SECONDS.review;
  return Math.ceil(s / 60);
}

const DAY_MS = 864e5;

/** When a studied card comes back, in study days (a day starts at `dayStartHour`). */
export function reviewLabel(due, now, dayStartHour = 4) {
  const days = Math.round((dayStart(due, dayStartHour) - dayStart(now, dayStartHour)) / DAY_MS);
  if (days <= 0) return 'Next review today';
  if (days === 1) return 'Next review tomorrow';
  return `Next review in ${days} days`;
}
