// Profile name and number rules (Global Constraints, "Profiles and sync").
export const NAME_ERROR = 'Name: letters and numbers only, up to 20.';
export const TAG_ERROR = 'Number: exactly 4 digits.';

const NAME_RE = /^[\p{L}\p{N}]{1,20}$/u;
const TAG_RE = /^\d{4}$/;

const clean = (s) => String(s ?? '').normalize('NFC').trim();

export const profileKey = (name, tag) => `${name.toLowerCase()}-${tag}`;

/** The error for a name, or null when it is valid. */
export const nameError = (name) => (NAME_RE.test(clean(name)) ? null : NAME_ERROR);

/** The error for a number, or null when it is valid. */
export const tagError = (tag) => (TAG_RE.test(clean(tag)) ? null : TAG_ERROR);

export function validateProfileInput(name, tag) {
  const error = nameError(name) ?? tagError(tag);
  if (error) return { ok: false, error };
  const n = clean(name), t = clean(tag);
  return { ok: true, key: profileKey(n, t), name: n, tag: t };
}
