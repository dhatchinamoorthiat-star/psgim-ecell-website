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
