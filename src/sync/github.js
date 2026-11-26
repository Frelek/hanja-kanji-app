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

function kindFor(status) {
  if (status === 401 || status === 403) return 'auth';
  if (status === 409 || status === 422) return 'conflict';
  return 'http';
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

  const fail = (res) => new SyncError(kindFor(res.status), res.status, `GitHub responded ${res.status}`);

  return {
    async listDir(path) {
      const res = await request(`${base}/contents/${encodePath(path)}`);
      if (res.status === 404) return [];
      if (!res.ok) throw fail(res);
      const list = await res.json();
      if (!Array.isArray(list)) return [];
      return list.map(({ name, path: p, sha }) => ({ name, path: p, sha }));
    },

    async getJson(path) {
      const res = await request(`${base}/contents/${encodePath(path)}`);
      if (res.status === 404) return null;
      if (!res.ok) throw fail(res);
      const body = await res.json();
      return { sha: body.sha, json: JSON.parse(fromBase64(body.content)) };
    },

    async putJson(path, json, sha, message) {
      const payload = { message, content: toBase64(JSON.stringify(json, null, 2) + '\n') };
      if (sha != null) payload.sha = sha;
      const res = await request(`${base}/contents/${encodePath(path)}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw fail(res);
      const body = await res.json();
      return { sha: body.content.sha };
    },

    async test() {
      try {
        const res = await request(base);
        if (res.ok) return { ok: true };
        if (res.status === 404) return { ok: false, kind: 'notfound' };
        return { ok: false, kind: kindFor(res.status) };
      } catch (e) {
        return { ok: false, kind: e.kind || 'http' };
      }
    },
  };
}
