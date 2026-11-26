// Loads a language's curriculum file and indexes it by card id and character.
const LANGS = ['ja', 'ko'];

export async function loadData(lang) {
  if (!LANGS.includes(lang)) throw new Error(`Unknown language: ${lang}`);
  const res = await globalThis.fetch(`./data/${lang}.json`);
  if (!res.ok) throw new Error(`Could not load ${lang} data (${res.status})`);
  const raw = await res.json();
  if (raw.lang !== lang) throw new Error(`./data/${lang}.json is for ${raw.lang}, not ${lang}`);
  const byId = new Map();
  const byChar = new Map();
  for (const c of raw.chars) {
    byId.set(c.id, c);
    byChar.set(c.char, c);
  }
  return { lang, levels: raw.levels, chars: raw.chars, parts: raw.parts, byId, byChar };
}
