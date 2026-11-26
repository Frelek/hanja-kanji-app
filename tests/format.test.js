import test from 'node:test';
import assert from 'node:assert/strict';
import { kunLabel, hunEumLabel, estimateMinutes } from '../src/ui/format.js';

test('kunLabel marks the okurigana boundary with a middle dot', () => {
  assert.equal(kunLabel('やす.む'), 'やす・む');
  assert.equal(kunLabel('くに'), 'くに');
  assert.equal(kunLabel('ひと.つ'), 'ひと・つ');
});

test('hunEumLabel joins the gloss and the sound', () => {
  assert.equal(hunEumLabel({ hun: '쉴', eum: '휴' }), '쉴 휴');
  assert.equal(hunEumLabel({ hun: '성(姓)', eum: '김' }), '성(姓) 김');
});

test('estimateMinutes: new 20s, learning 10s, review 8s, rounded up', () => {
  assert.equal(estimateMinutes({ new: 10, learning: 5, review: 34 }), 9);
  assert.equal(estimateMinutes({ new: 0, learning: 0, review: 0 }), 0);
  assert.equal(estimateMinutes({ new: 1, learning: 0, review: 0 }), 1);
  assert.equal(estimateMinutes({ new: 3, learning: 0, review: 0 }), 1);
  assert.equal(estimateMinutes({ new: 0, learning: 0, review: 8 }), 2);
  assert.equal(estimateMinutes({ new: 10, learning: 0, review: 0 }), 4);
});

test('reviewLabel counts study days to the due date', async () => {
  const { reviewLabel } = await import('../src/ui/format.js');
  const D = (m, d, hh = 0, mm = 0) => new Date(2026, m - 1, d, hh, mm);
  const now = D(3, 10, 12);
  assert.equal(reviewLabel(D(3, 10, 12, 10), now, 4), 'Next review today');
  assert.equal(reviewLabel(D(3, 9, 8), now, 4), 'Next review today'); // overdue
  assert.equal(reviewLabel(D(3, 11, 3, 59), now, 4), 'Next review today'); // before 04:00 is still today
  assert.equal(reviewLabel(D(3, 11, 4), now, 4), 'Next review tomorrow');
  assert.equal(reviewLabel(D(3, 22, 9), now, 4), 'Next review in 12 days');
  // Across the March DST change the count stays in whole days.
  assert.equal(reviewLabel(D(4, 9, 9), now, 4), 'Next review in 30 days');
  // After midnight but before the day starts, "tomorrow" is the next 04:00 day.
  assert.equal(reviewLabel(D(3, 11, 9), D(3, 11, 2), 4), 'Next review tomorrow');
});
