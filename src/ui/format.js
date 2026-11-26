// Small display formatters shared by the Study screens.

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
