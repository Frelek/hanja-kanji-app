// Thin GitHub Contents API client. Pure: no DOM, no IndexedDB, fetch is injected.

export class SyncError extends Error {
  constructor(kind, status, message) {
    super(message || kind);
    this.name = 'SyncError';
    this.kind = kind;
    this.status = status;
  }
}

const API = 'https://api.github.com/repos/';
const REPO_RE = /^[\w.-]+\/[\w.-]+$/;
const CHUNK = 0x8000;

export function toBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

export function fromBase64(b64) {
  const bin = atob(String(b64).replace(/\s/g, ''));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

const encodePath = (path) => String(path).split('/').map(encodeURIComponent).join('/');

/** The exact text putJson stores for a value: compact JSON, so a week of the log stays small. */
export const fileText = (json) => JSON.stringify(json) + '\n';

/**
 * Whether a 403 is about something a new token would not fix: a file over the Contents
 * API's 1 MB read limit ("too_large") or a rate limit. Any other 403 is the token's.
 */
async function notTheToken(res) {
  if (res.headers?.get?.('x-ratelimit-remaining') === '0') return true;
  let body;
  try {
    body = await res.json();
  } catch {
    return false;
  }
  if (Array.isArray(body?.errors) && body.errors.some((e) => e?.code === 'too_large')) return true;
  return /too large|rate limit/i.test(String(body?.message ?? ''));
}

async function kindOf(res) {
  if (res.status === 401) return 'auth';
  if (res.status === 403) return (await notTheToken(res)) ? 'http' : 'auth';
  if (res.status === 409 || res.status === 422) return 'conflict';
  return 'http';
}

const fail = async (res) => new SyncError(await kindOf(res), res.status, `GitHub responded ${res.status}`);

/** The JSON body of a response. One that cannot be read (cut off, timed out) is an http problem. */
async function bodyOf(res) {
  try {
    return await res.json();
  } catch {
    throw new SyncError('http', res.status, 'GitHub sent an answer that could not be read');
  }
}

export function createGitHubClient({ token, repo, fetch = globalThis.fetch }) {
  if (typeof repo !== 'string' || !REPO_RE.test(repo)) {
    throw new SyncError('notfound', undefined, 'Invalid repository name');
  }
  const base = API + repo;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  async function request(url, init = {}) {
    try {
      return await fetch(url, {
        ...init,
        headers: init.body ? { ...headers, 'Content-Type': 'application/json' } : headers,
        cache: 'no-store',
      });
    } catch (e) {
      if (e instanceof TypeError) throw new SyncError('offline', undefined, 'Network unavailable');
      throw new SyncError('http', undefined, 'Request failed');
    }
  }

  return {
    async listDir(path) {
      const res = await request(`${base}/contents/${encodePath(path)}`);
      if (res.status === 404) return [];
      if (!res.ok) throw await fail(res);
      const list = await bodyOf(res);
      if (!Array.isArray(list)) return [];
      return list.map(({ name, path: p, sha }) => ({ name, path: p, sha }));
    },

    async getJson(path) {
      const res = await request(`${base}/contents/${encodePath(path)}`);
      if (res.status === 404) return null;
      if (!res.ok) throw await fail(res);
      const body = await bodyOf(res);
      // A file over 1 MB read with the object media type comes with empty content.
      if (typeof body?.sha !== 'string' || typeof body.content !== 'string' || body.content === '') {
        throw new SyncError('http', res.status, `${path} came without its content`);
      }
      try {
        return { sha: body.sha, json: JSON.parse(fromBase64(body.content)) };
      } catch {
        throw new SyncError('http', res.status, `${path} is not valid JSON`);
      }
    },

    async putJson(path, json, sha, message) {
      const payload = { message, content: toBase64(fileText(json)) };
      if (sha != null) payload.sha = sha;
      const res = await request(`${base}/contents/${encodePath(path)}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw await fail(res);
      const body = await bodyOf(res);
      if (typeof body?.content?.sha !== 'string') throw new SyncError('http', res.status, `${path} was not confirmed`);
      return { sha: body.content.sha };
    },

    async test() {
      try {
        const res = await request(base);
        if (res.ok) return { ok: true };
        if (res.status === 404) return { ok: false, kind: 'notfound' };
        return { ok: false, kind: await kindOf(res) };
      } catch (e) {
        return { ok: false, kind: e.kind || 'http' };
      }
    },
  };
}
