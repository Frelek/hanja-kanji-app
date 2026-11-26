import test from 'node:test';
import assert from 'node:assert/strict';
import { polylineLength, pathD, strokeUrl, parseStrokes, numberSpots, STROKE_MS, GAP_MS, FLIP } from '../src/ui/strokes.js';

test('polylineLength sums the segment lengths', () => {
  assert.equal(polylineLength([[0, 0], [3, 4]]), 5);
  assert.equal(polylineLength([[0, 0], [3, 4], [3, 10]]), 11);
  assert.equal(polylineLength([[7, 7]]), 0);
  assert.equal(polylineLength([]), 0);
});

test('pathD draws the points as one polyline', () => {
  assert.equal(pathD([[256, 812], [404, 718]]), 'M256 812L404 718');
  assert.equal(pathD([[40, 543], [105, 536], [449, 610]]), 'M40 543L105 536L449 610');
  // A one-point stroke still draws: a zero-length segment shows as a round dot.
  assert.equal(pathD([[10, 20]]), 'M10 20L10 20');
  assert.equal(pathD([[1.5, -86.25], [2, 3]]), 'M1.5 -86.25L2 3');
});

test('strokeUrl uses the lowercase, unpadded code point', () => {
  assert.equal(strokeUrl('ja', '休'), './data/strokes/ja/4f11.json');
  assert.equal(strokeUrl('ja', '読'), './data/strokes/ja/8aad.json');
  assert.equal(strokeUrl('ko', '敎'), './data/strokes/ko/654e.json');
  assert.equal(strokeUrl('ja', '一'), './data/strokes/ja/4e00.json');
  // Outside the BMP: one code point, not two UTF-16 halves.
  assert.equal(strokeUrl('ko', '𡥉'), './data/strokes/ko/21949.json');
});

test('strokeUrl refuses an unknown language or an empty char', () => {
  assert.throws(() => strokeUrl('zh', '休'));
  assert.throws(() => strokeUrl('ja', ''));
});

test('parseStrokes keeps well-formed medians and rejects anything else', () => {
  assert.deepEqual(parseStrokes({ m: [[[0, 0], [1, 1]], [[5, 5]]] }), [[[0, 0], [1, 1]], [[5, 5]]]);
  for (const bad of [null, {}, { m: [] }, { m: 'x' }, { m: [[]] }, { m: [[[0]]] }, { m: [[[0, 'a']]] }, { m: [[[0, NaN]]] }]) {
    assert.equal(parseStrokes(bad), null, JSON.stringify(bad));
  }
});

test('timings: about 600 ms a stroke with a 150 ms gap', () => {
  assert.equal(STROKE_MS, 600);
  assert.equal(GAP_MS, 150);
});

test('the flip maps the y-up source box into the 1024 view box', () => {
  assert.equal(FLIP, 'scale(1,-1) translate(0,-900)');
});

test('numberSpots puts each number just behind its stroke start, apart from the others', () => {
  // 口: strokes 1 and 2 start at the same corner.
  const kuchi = [
    [[200, 700], [200, 100]],
    [[200, 700], [800, 700], [800, 100]],
    [[200, 120], [800, 120]],
  ];
  const spots = numberSpots(kuchi);
  assert.equal(spots.length, 3);
  // Stroke 1 runs down, so its number sits above the start.
  assert.deepEqual(spots[0], [200, 752]);
  for (let i = 0; i < spots.length; i++) {
    const [x, y] = spots[i];
    const [sx, sy] = kuchi[i][0];
    assert.ok(Math.hypot(x - sx, y - sy) <= 130, `number ${i + 1} stays near its start`);
    for (let j = 0; j < i; j++) {
      assert.ok(Math.hypot(x - spots[j][0], y - spots[j][1]) >= 84, `numbers ${j + 1} and ${i + 1} overlap`);
    }
  }
});

test('numberSpots handles a one-point stroke', () => {
  assert.equal(numberSpots([[[500, 500]]]).length, 1);
});
