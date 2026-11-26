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
