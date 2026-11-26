import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProfileInput, NAME_ERROR, TAG_ERROR } from '../src/ui/profile-input.js';

test('error strings are exact', () => {
  assert.equal(NAME_ERROR, 'Name: letters and numbers only, up to 20.');
  assert.equal(TAG_ERROR, 'Number: exactly 4 digits.');
});

test('Kacper#1234 is ok with a lower-case key', () => {
  assert.deepEqual(validateProfileInput('Kacper', '1234'),
    { ok: true, key: 'kacper-1234', name: 'Kacper', tag: '1234' });
});

test('Polish letters are ok and a leading-zero tag stays a string', () => {
  const r = validateProfileInput('Łucja', '0042');
  assert.equal(r.ok, true);
  assert.equal(r.tag, '0042');
  assert.equal(r.name, 'Łucja');
  assert.equal(r.key, 'łucja-0042');
});

test('Korean letters are ok', () => {
  const r = validateProfileInput('한별', '7777');
  assert.equal(r.ok, true);
  assert.equal(r.key, '한별-7777');
});

test('Kacper and kacper give the same key', () => {
  assert.equal(validateProfileInput('Kacper', '1234').key, validateProfileInput('kacper', '1234').key);
});

test('decomposed accents are normalised to NFC', () => {
  const r = validateProfileInput('René', '1234');
  assert.equal(r.ok, true);
  assert.equal(r.name, 'René');
});

test('a 20-character name is ok and 21 is not', () => {
  assert.equal(validateProfileInput('a'.repeat(20), '1234').ok, true);
  assert.deepEqual(validateProfileInput('a'.repeat(21), '1234'), { ok: false, error: NAME_ERROR });
});

for (const name of ['Ka cper', 'Kacper🙂', '', 'Kacper!', 'Kacper_1']) {
  test(`name ${JSON.stringify(name)} fails with the name error`, () => {
    assert.deepEqual(validateProfileInput(name, '1234'), { ok: false, error: NAME_ERROR });
  });
}

for (const tag of ['12a4', '12345', '123', '', '１２３４']) {
  test(`number ${JSON.stringify(tag)} fails with the number error`, () => {
    assert.deepEqual(validateProfileInput('Kacper', tag), { ok: false, error: TAG_ERROR });
  });
}

test('surrounding whitespace is ignored', () => {
  assert.deepEqual(validateProfileInput(' Kacper ', ' 1234 '),
    { ok: true, key: 'kacper-1234', name: 'Kacper', tag: '1234' });
});

test('a bad name is reported before a bad number', () => {
  assert.deepEqual(validateProfileInput('', ''), { ok: false, error: NAME_ERROR });
});
