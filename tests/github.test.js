import test from 'node:test';
import assert from 'node:assert/strict';
import { createGitHubClient, SyncError, fileText } from '../src/sync/github.js';

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
  // compact, so a week of heavy study stays far below the 1 MB read limit
  assert.equal(text, JSON.stringify(value) + '\n');
  assert.equal(fileText({ entries: [{ id: 'a', at: 'b' }] }), '{"entries":[{"id":"a","at":"b"}]}\n');
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

// GitHub answers a Contents read of a file over 1 MB with this 403.
const TOO_LARGE = {
  message: 'This API returns blobs up to 1 MB in size. The requested blob is too large to fetch via the API, but you can use the Git Data API to request blobs up to 100 MB in size.',
  errors: [{ resource: 'Blob', field: 'data', code: 'too_large' }],
  documentation_url: 'https://docs.github.com/rest/repos/contents#get-repository-content',
  status: '403',
};

test('a 403 that is not about the token maps to http, not auth', async () => {
  const bodies = [
    TOO_LARGE,
    { message: 'API rate limit exceeded for user ID 1.', documentation_url: 'x' },
    { message: 'You have exceeded a secondary rate limit. Please wait a few minutes before you try again.' },
  ];
  for (const body of bodies) {
    const { fetch } = mock(() => res(403, body));
    const c = client(fetch);
    for (const op of [() => c.getJson('x'), () => c.listDir('x'), () => c.putJson('x', {}, null, 'm')]) {
      await assert.rejects(op, (e) => e instanceof SyncError && e.kind === 'http' && e.status === 403, body.message);
    }
    assert.deepEqual(await c.test(), { ok: false, kind: 'http' }, body.message);
  }
  // rate limited, as the headers tell, whatever the body says
  const limited = mock(() => ({ ...res(403, {}), headers: new Headers({ 'x-ratelimit-remaining': '0' }) }));
  await assert.rejects(client(limited.fetch).getJson('x'), (e) => e.kind === 'http');
  // a token without access to the repo stays auth
  const denied = mock(() => res(403, { message: 'Resource not accessible by personal access token' }));
  await assert.rejects(client(denied.fetch).getJson('x'), (e) => e.kind === 'auth' && e.status === 403);
  const unreadable = mock(() => ({ status: 403, ok: false, json: async () => { throw new SyntaxError('bad'); } }));
  await assert.rejects(client(unreadable.fetch).getJson('x'), (e) => e.kind === 'auth');
});

test('a body that cannot be read, or a file with no content, is an http problem', async () => {
  const broken = { status: 200, ok: true, json: async () => { throw new SyntaxError('Unexpected end of JSON input'); } };
  const c = client(mock(() => broken).fetch);
  for (const op of [() => c.getJson('x'), () => c.listDir('x'), () => c.putJson('x', {}, null, 'm')]) {
    await assert.rejects(op, (e) => e instanceof SyncError && e.kind === 'http' && e.status === 200);
  }
  // the object media type gives an empty content for a large file; a damaged answer may have none
  for (const body of [{ sha: 's', content: '', encoding: 'none' }, { sha: 's' }, null, { sha: 's', content: 'bm90IGpzb24=' }]) {
    await assert.rejects(client(mock(() => res(200, body)).fetch).getJson('x'),
      (e) => e instanceof SyncError && e.kind === 'http' && e.status === 200, JSON.stringify(body));
  }
  // an upload whose answer has no sha
  await assert.rejects(client(mock(() => res(201, {})).fetch).putJson('x', {}, null, 'm'),
    (e) => e instanceof SyncError && e.kind === 'http' && e.status === 201);
});

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
