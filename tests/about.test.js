// The About screen credits every source data/LICENSES.md lists (spec §5).
import test from 'node:test';
import assert from 'node:assert/strict';
import { SOURCES } from '../src/ui/About.js';

const row = (re) => SOURCES.find(([name]) => re.test(name));

test('About credits every data source, font and library with its licence', () => {
  const expect = [
    [/^Klee One/, /OFL|Open Font License/],
    [/^Gowun Batang/, /OFL|Open Font License/],
    [/^Noto Serif KR/, /Open Font License 1\.1/],
    [/^animCJK/, /Arphic.*LGPL/],
    [/^kanji-data/, /MIT.*KANJIDIC.*CC BY-SA/],
    [/^JLPT decks/, /MIT/],
    [/한국어문회/, /한국어문회/],
    [/^kengdic/, /MPL 2\.0.*LGPL/],
    [/ids\.txt/, /GPLv2/],
    [/joyo2010/, /CC BY-SA/],
    [/^ts-fsrs/, /MIT/],
    [/^htm/, /Apache-2\.0/],
    [/^Preact/, /MIT/],
  ];
  for (const [name, licence] of expect) {
    const r = row(name);
    assert.ok(r, `no About row for ${name}`);
    assert.match(r[1], licence, r[0]);
  }
  // ids.txt and the Jōyō table are separate rows
  assert.notEqual(row(/ids\.txt/), row(/joyo2010/));
});
