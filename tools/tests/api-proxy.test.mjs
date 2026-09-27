// Tests for the Pages Function in functions/api/[[path]].js. Kept outside functions/
// because Pages turns every file there into a route.
// Run from the repo root: node --test "tools/tests/*.test.mjs"
import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { onRequest } from '../../functions/api/[[path]].js';

const realFetch = globalThis.fetch;
afterEach(() => (globalThis.fetch = realFetch));

function capture(response = new Response('{"ok":true}', { status: 200, headers: { 'Set-Cookie': 'ecell_session=abc; HttpOnly; Path=/' } })) {
  const calls = [];
  globalThis.fetch = async (url, init) => (calls.push({ url: String(url), init }), response);
  return calls;
}

test('is inert without API_ORIGIN', async () => {
  const calls = capture();
  const res = await onRequest({ request: new Request('https://site.example/api/v1/auth/me'), env: {} });
  assert.equal(res.status, 503);
  assert.equal((await res.json()).error.code, 'api_unavailable');
  assert.equal(calls.length, 0);
});

test('never exposes the internal tick endpoint', async () => {
  const calls = capture();
  const res = await onRequest({ request: new Request('https://site.example/api/v1/internal/tick', { method: 'POST' }), env: { API_ORIGIN: 'https://api.example' } });
  assert.equal(res.status, 404);
  assert.equal(calls.length, 0);
});

test('forwards path, query, method, body and CSRF header; strips Host', async () => {
  const calls = capture();
  const request = new Request('https://site.example/api/v1/auth/login?x=1', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': 'tok', Cookie: 'csrftoken=tok', Host: 'site.example' },
    body: JSON.stringify({ email: 'a@b.c' }),
    duplex: 'half',
  });
  const res = await onRequest({ request, env: { API_ORIGIN: 'https://api.example' } });
  assert.equal(res.status, 200);
  const [call] = calls;
  assert.equal(call.url, 'https://api.example/api/v1/auth/login?x=1');
  assert.equal(call.init.method, 'POST');
  assert.equal(call.init.headers.get('x-csrftoken'), 'tok');
  assert.equal(call.init.headers.get('cookie'), 'csrftoken=tok');
  assert.equal(call.init.headers.get('host'), null);
  assert.equal(call.init.headers.get('x-forwarded-host'), 'site.example');
  assert.equal(call.init.headers.get('x-forwarded-proto'), 'https');
  assert.equal(call.init.redirect, 'manual');
});

test('passes Set-Cookie back so the session stays first-party, and is never cached', async () => {
  capture();
  const res = await onRequest({ request: new Request('https://site.example/api/v1/auth/me'), env: { API_ORIGIN: 'https://api.example' } });
  assert.match(res.headers.get('set-cookie'), /ecell_session=abc/);
  assert.equal(res.headers.get('cache-control'), 'no-store');
});

test('answers 502 in the contract shape when the backend is down', async () => {
  globalThis.fetch = async () => {
    throw new TypeError('connect ECONNREFUSED');
  };
  const res = await onRequest({ request: new Request('https://site.example/api/v1/auth/me'), env: { API_ORIGIN: 'https://api.example' } });
  assert.equal(res.status, 502);
  assert.equal((await res.json()).error.code, 'api_unreachable');
});

// --- Path safety (review finding F2) --------------------------------------------------------------

const ORIGIN = { API_ORIGIN: 'https://api.example' };

// Every representation that could resolve to /api/v1/internal/* on Django, plus traversal and junk.
const BLOCKED = [
  '/api/v1/internal/tick',
  '/api/v1/internal',
  '/api/v1/%69nternal/tick', // encoded letter
  '/api/v1/%69NTERNAL/tick', // encoded + upper case
  '/api/v1/%49nTeRnAl/tick', // encoded capital + mixed case
  '/api/v1/INTERNAL/tick',
  '/api/v1/Internal/tick',
  '/api/v1//internal/tick', // repeated slash
  '/api//v1/internal/tick',
  '/api/v1/%2finternal/tick', // encoded slash
  '/api/v1/%5Cinternal/tick', // encoded backslash
  '/api/v1/auth/%2e%2e/internal/tick', // encoded traversal (URL parser leaves it; Django would decode it)
  '/api/v1/auth/.%2e/internal/tick',
  '/api/v1/%252e%252e/internal/tick', // double encoding
  '/api/v1/%2569nternal/tick',
  '/api/v1/internal%3Ftick', // encoded query delimiter
  '/api/v1/internal%23x',
  '/api/v1/unknown-resource',
  '/api/v2/auth/me',
  '/api/v1/',
  '/api/v1/auth/me/', // trailing slash: API has none
  '/api/v1/%', // malformed encoding
  '/api/v1/%E0%A4%A', // malformed UTF-8
];

for (const path of BLOCKED) {
  test(`never forwards ${path}`, async () => {
    const calls = capture();
    const res = await onRequest({ request: new Request('https://site.example' + path, { method: 'POST' }), env: ORIGIN });
    assert.ok([400, 404].includes(res.status), `status ${res.status}`);
    assert.equal(calls.length, 0, `forwarded to ${calls[0]?.url}`);
    assert.ok((await res.json()).error.code);
  });
}

test('dot segments are resolved by the URL parser before the check and stay blocked', async () => {
  for (const path of ['/api/v1/./internal/tick', '/api/v1/auth/../internal/tick', '/api/v1/x/../internal/tick']) {
    const calls = capture();
    const res = await onRequest({ request: new Request('https://site.example' + path), env: ORIGIN });
    assert.equal(res.status, 404, path);
    assert.equal(calls.length, 0, path);
  }
});

test('internal paths hidden in the query string are not a route: path decides', async () => {
  const calls = capture();
  const ok = await onRequest({ request: new Request('https://site.example/api/v1/auth/me?next=/api/v1/internal/tick'), env: ORIGIN });
  assert.equal(ok.status, 200);
  assert.equal(calls[0].url, 'https://api.example/api/v1/auth/me?next=/api/v1/internal/tick');
  const calls2 = capture();
  const blocked = await onRequest({ request: new Request('https://site.example/api/v1/internal/tick?x=/api/v1/auth/me'), env: ORIGIN });
  assert.equal(blocked.status, 404);
  assert.equal(calls2.length, 0);
});

test('the upstream host is always API_ORIGIN (no SSRF through the path)', async () => {
  for (const path of ['/api//evil.example/x', '/api/@evil.example/x', '/api/v1/@evil.example', '/api/v1/auth/me?host=evil.example', '/api/v1/%40evil.example']) {
    const calls = capture();
    await onRequest({ request: new Request('https://site.example' + path), env: ORIGIN });
    for (const c of calls) assert.equal(new URL(c.url).host, 'api.example', `${path} -> ${c.url}`);
  }
});

test('API_ORIGIN with a path or credentials still only yields its own origin', async () => {
  const calls = capture();
  await onRequest({ request: new Request('https://site.example/api/v1/auth/me'), env: { API_ORIGIN: 'https://user:pw@api.example/some/base' } });
  assert.equal(calls[0].url, 'https://api.example/api/v1/auth/me');
});

test('legitimate API paths still forward unchanged', async () => {
  const uuid = '3f1c2b1e-9a55-4c1e-8d9e-2a8f5d1f6b10';
  for (const path of [
    '/api/v1/auth/csrf',
    '/api/v1/auth/password/reset',
    `/api/v1/users/${uuid}/deactivate`,
    `/api/v1/role-assignments/${uuid}/revoke`,
    '/api/v1/academic-years',
    '/api/v1/schema',
  ]) {
    const calls = capture();
    const res = await onRequest({ request: new Request('https://site.example' + path), env: ORIGIN });
    assert.equal(res.status, 200, path);
    assert.equal(calls[0].url, 'https://api.example' + path);
  }
});

// --- Client-IP trust boundary (review finding F4) --------------------------------------------------

test('attaches the proxy shared secret when configured', async () => {
  const calls = capture();
  const request = new Request('https://site.example/api/v1/auth/me');
  await onRequest({ request, env: { API_ORIGIN: 'https://api.example', PROXY_SHARED_SECRET: 'topsecret' } });
  assert.equal(calls[0].init.headers.get('x-ecell-proxy-secret'), 'topsecret');
});

test('sends no proxy secret header when none is configured', async () => {
  const calls = capture();
  const request = new Request('https://site.example/api/v1/auth/me');
  await onRequest({ request, env: { API_ORIGIN: 'https://api.example' } });
  assert.equal(calls[0].init.headers.get('x-ecell-proxy-secret'), null);
});

test('strips any client-supplied proxy secret before forwarding', async () => {
  const calls = capture();
  const request = new Request('https://site.example/api/v1/auth/me', { headers: { 'X-Ecell-Proxy-Secret': 'forged' } });
  await onRequest({ request, env: { API_ORIGIN: 'https://api.example', PROXY_SHARED_SECRET: 'real' } });
  assert.equal(calls[0].init.headers.get('x-ecell-proxy-secret'), 'real');
});

test('backend implementation headers are not passed to the browser', async () => {
  capture(new Response('ok', { headers: { Server: 'gunicorn', 'X-Powered-By': 'x', 'Set-Cookie': 'a=b' } }));
  const res = await onRequest({ request: new Request('https://site.example/api/v1/auth/me'), env: ORIGIN });
  assert.equal(res.headers.get('server'), null);
  assert.equal(res.headers.get('x-powered-by'), null);
  assert.equal(res.headers.get('set-cookie'), 'a=b');
});
