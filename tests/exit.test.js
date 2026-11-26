// Exit from a study session or a practice round replaces the history entry, so Back
// does not lead into the screen just left.
import test from 'node:test';
import assert from 'node:assert/strict';
import { exitSession } from '../src/ui/Session.js';
import { exitPractice } from '../src/ui/Practice.js';

function fakeLocation(hash) {
  const log = [];
  globalThis.location = {
    pathname: '/', search: '',
    get hash() { return hash; },
    set hash(h) { log.push(['push', h]); hash = h; },
    replace(h) { log.push(['replace', h]); hash = h; },
  };
  return log;
}

test('Exit from a session replaces #/session with #/study', () => {
  const log = fakeLocation('#/session');
  exitSession();
  assert.deepEqual(log, [['replace', '#/study']]);
});

test('Exit from practice replaces it with the level\'s characters', () => {
  const log = fakeLocation('#/practice/4%EA%B8%89%E2%85%A1');
  exitPractice('4급Ⅱ');
  assert.deepEqual(log, [['replace', '#/characters/4%EA%B8%89%E2%85%A1']]);
});
