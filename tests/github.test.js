import test from 'node:test';
import assert from 'node:assert/strict';
import { createGitHubClient, SyncError } from '../src/sync/github.js';

const TOKEN = 'github_pat_SECRET123';
const REPO = 'Frelek/hanja-kanji-progress';

const res = (status, body) => ({
  status,
  ok: status >= 200 && status < 300,
  json: async () => body,
});

function mock(handler) {
  const calls = [];
  const fetch = async (url, init = {}) => {
    calls.push({ url, init });
    return handler(url, init, calls.length);
  };
  return { fetch, calls };
}

const client = (fetch) => createGitHubClient({ token: TOKEN, repo: REPO, fetch });

test('putJson then getJson round-trips CJK text exactly', async () => {
  const stored = {};
  const { fetch, calls } = mock((url, init) => {
    if (init.method === 'PUT') {
      const body = JSON.parse(init.body);
      stored.content = body.content;
      return res(201, { content: { sha: 'sha1' } });
    }
    // GitHub wraps base64 with newlines
    const wrapped = stored.content.replace(/(.{20})/g, '$1\n');
    return res(200, { sha: 'sha1', content: wrapped, encoding: 'base64' });
  });
  const c = client(fetch);
  const value = { w: '學校', kana: 'がっこう' };
  const put = await c.putJson('profiles/a/profile.json', value, null, 'msg');
  assert.deepEqual(put, { sha: 'sha1' });
  const got = await c.getJson('profiles/a/profile.json');
  assert.equal(got.sha, 'sha1');
  assert.deepEqual(got.json, value);
  const body = JSON.parse(calls[0].init.body);
  assert.equal('sha' in body, false);
  assert.equal(body.message, 'msg');
  const text = Buffer.from(body.content, 'base64').toString('utf8');
  assert.equal(text, JSON.stringify(value, null, 2) + '\n');
});

test('putJson sends sha when given', async () => {
  const { fetch, calls } = mock(() => res(200, { content: { sha: 'new' } }));
  await client(fetch).putJson('a/b.json', {}, 'old', 'm');
  assert.equal(JSON.parse(calls[0].init.body).sha, 'old');
});

test('requests carry headers, encoded URL and the token only in Authorization', async () => {
  const { fetch, calls } = mock(() => res(200, []));
  await client(fetch).listDir('profiles/a b/x');
  const { url, init } = calls[0];
  assert.equal(url, `https://api.github.com/repos/${REPO}/contents/profiles/a%20b/x`);
  assert.equal(init.headers.Authorization, `Bearer ${TOKEN}`);
  assert.equal(init.headers.Accept, 'application/vnd.github+json');
  assert.equal(init.headers['X-GitHub-Api-Version'], '2022-11-28');
  assert.equal(init.cache, 'no-store');
  assert.equal(url.includes(TOKEN), false);
});

test('listDir maps entries and 404 gives []', async () => {
  const ok = mock(() => res(200, [{ name: 'a.json', path: 'p/a.json', sha: 's', size: 1, type: 'file' }]));
  assert.deepEqual(await client(ok.fetch).listDir('p'), [{ name: 'a.json', path: 'p/a.json', sha: 's' }]);
  const nf = mock(() => res(404, {}));
  assert.deepEqual(await client(nf.fetch).listDir('p'), []);
});

test('getJson returns null on 404', async () => {
  const { fetch } = mock(() => res(404, {}));
  assert.equal(await client(fetch).getJson('x.json'), null);
});

for (const [status, kind] of [[401, 'auth'], [403, 'auth'], [409, 'conflict'], [422, 'conflict'], [500, 'http'], [418, 'http']]) {
  test(`status ${status} maps to ${kind}`, async () => {
    const { fetch } = mock(() => res(status, {}));
    const c = client(fetch);
    for (const op of [() => c.getJson('x'), () => c.listDir('x'), () => c.putJson('x', {}, null, 'm')]) {
      await assert.rejects(op, (e) => {
        assert.ok(e instanceof SyncError);
        assert.equal(e.kind, kind);
        assert.equal(e.status, status);
        assert.equal(e.message.includes(TOKEN), false);
        return true;
      });
    }
  });
}

test('a TypeError from fetch maps to offline', async () => {
  const fetch = async () => { throw new TypeError('Failed to fetch'); };
  await assert.rejects(client(fetch).getJson('x'), (e) => e instanceof SyncError && e.kind === 'offline');
  const r = await client(fetch).test();
  assert.deepEqual(r, { ok: false, kind: 'offline' });
});

test('test() checks the repo and maps statuses', async () => {
  let m = mock(() => res(200, {}));
  assert.deepEqual(await client(m.fetch).test(), { ok: true });
  assert.equal(m.calls[0].url, `https://api.github.com/repos/${REPO}`);
  m = mock(() => res(401, {}));
  assert.deepEqual(await client(m.fetch).test(), { ok: false, kind: 'auth' });
  m = mock(() => res(403, {}));
  assert.deepEqual(await client(m.fetch).test(), { ok: false, kind: 'auth' });
  m = mock(() => res(404, {}));
  assert.deepEqual(await client(m.fetch).test(), { ok: false, kind: 'notfound' });
  m = mock(() => res(500, {}));
  assert.deepEqual(await client(m.fetch).test(), { ok: false, kind: 'http' });
});

test('a malformed repo throws notfound', () => {
  for (const repo of ['nope', 'a/b/c', '', 'a/b?x=1']) {
    assert.throws(() => createGitHubClient({ token: TOKEN, repo, fetch: async () => {} }),
      (e) => e instanceof SyncError && e.kind === 'notfound');
  }
});

test('large content round-trips (chunked base64)', async () => {
  let content;
  const { fetch } = mock((url, init) => {
    if (init.method === 'PUT') { content = JSON.parse(init.body).content; return res(200, { content: { sha: 's' } }); }
    return res(200, { sha: 's', content });
  });
  const c = client(fetch);
  const big = { s: '漢字한글'.repeat(20000) };
  await c.putJson('big.json', big, null, 'm');
  assert.deepEqual((await c.getJson('big.json')).json, big);
});
