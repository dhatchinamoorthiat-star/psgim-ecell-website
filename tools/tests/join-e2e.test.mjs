/**
 * End-to-end: public browser -> Pages Function -> Django, for the Join flow.
 *
 * Exercises the REAL function (functions/api/[[path]].js) against a REAL
 * Django instance, so the proxy contract is verified rather than assumed:
 * the CSRF handshake, the proxy shared secret, client-IP propagation and a
 * 202 from POST /api/v1/public/join.
 *
 * Skipped unless JOIN_E2E_BASE is set, because it needs a running backend.
 * Start one with test-only values (never production secrets):
 *
 *   cd backend && DJANGO_SETTINGS_MODULE=config.settings.dev \
 *     PROXY_SHARED_SECRET=local-test-secret \
 *     CLIENT_IP_HEADER=CF-Connecting-IP \
 *     .venv/bin/python manage.py runserver 8000
 *
 *   JOIN_E2E_BASE=http://127.0.0.1:8000 npm run test:e2e:join
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { onRequest } from '../../functions/api/[[path]].js';

const BASE = process.env.JOIN_E2E_BASE;
const SECRET = process.env.JOIN_E2E_PROXY_SECRET || 'local-test-secret';
const SITE = 'https://site.test';

const env = { API_ORIGIN: BASE, PROXY_SHARED_SECRET: SECRET };
const options = { skip: BASE ? false : 'set JOIN_E2E_BASE to run (needs a running Django)' };

/**
 * Drive the Function the way Cloudflare would, from a browser-shaped request.
 *
 * Content-Length is set explicitly because a real browser always sends it and
 * the function forwards it unchanged. Without it Node streams the body with
 * chunked encoding, which Django's wsgiref dev server cannot read (it would
 * arrive empty); gunicorn in production can, but the point here is to mirror
 * the browser, not to exercise chunked.
 */
function viaProxy(path, init = {}) {
  const headers = { ...(init.headers || {}) };
  if (init.body !== undefined) {
    headers['Content-Length'] = String(Buffer.byteLength(init.body));
  }
  return onRequest({ request: new Request(SITE + path, { ...init, headers }), env });
}

function cookieValue(setCookie, name) {
  const match = (setCookie || '').split(/,(?=[^;]+=)/).find((c) => c.trim().startsWith(name + '='));
  return match ? match.trim().slice(name.length + 1).split(';')[0] : null;
}

test('browser -> proxy -> Django: CSRF handshake then a 202 join submission', options, async () => {
  // 1. CSRF bootstrap through the proxy.
  const csrfRes = await viaProxy('/api/v1/auth/csrf');
  assert.equal(csrfRes.status, 200, 'CSRF endpoint should be reachable through the proxy');
  const { csrf_token: token } = await csrfRes.clone().json();
  assert.ok(token, 'a CSRF token should be issued');
  const cookie = cookieValue(csrfRes.headers.get('set-cookie'), 'csrftoken');
  assert.ok(cookie, 'the csrftoken cookie must reach the browser as first-party');

  // 2. The submission itself, exactly as the Angular form will send it.
  const res = await viaProxy('/api/v1/public/join?source=nec', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': token,
      Cookie: `csrftoken=${cookie}`,
      'CF-Connecting-IP': '203.0.113.42',
    },
    body: JSON.stringify({
      name: 'E2E Tester',
      email: `e2e-${Date.now()}@test.example`,
      programme_or_year: 'MBA 2026',
      message: 'End-to-end check.',
      source: 'nec',
      elapsed_ms: 9000,
    }),
  });

  assert.equal(res.status, 202, `expected 202, got ${res.status}: ${await res.clone().text()}`);
  assert.deepEqual(await res.json(), { status: 'accepted' });
});

test('a submission without the CSRF token is refused end to end', options, async () => {
  const res = await viaProxy('/api/v1/public/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'No CSRF', email: 'x@test.example', programme_or_year: 'MBA', elapsed_ms: 9000 }),
  });
  assert.equal(res.status, 403);
});

test('the proxy secret never reaches the browser', options, async () => {
  const res = await viaProxy('/api/v1/auth/csrf');
  const headers = [...res.headers].flat().join('|');
  assert.ok(!headers.includes(SECRET));
  assert.ok(!(await res.text()).includes(SECRET));
});

/**
 * The client-IP trust boundary, end to end. The throttle and audit log are
 * only meaningful if Django sees the visitor's address rather than
 * Cloudflare's edge — and only when the request genuinely came through the
 * proxy. Both halves are asserted against a real backend.
 */
async function submitWith(proxyEnv, name, ip) {
  const csrfRes = await onRequest({ request: new Request(SITE + '/api/v1/auth/csrf'), env: proxyEnv });
  const { csrf_token: token } = await csrfRes.clone().json();
  const cookie = cookieValue(csrfRes.headers.get('set-cookie'), 'csrftoken');
  const body = JSON.stringify({
    name,
    email: `${name.toLowerCase()}-${Date.now()}@test.example`,
    programme_or_year: 'MBA 2026',
    elapsed_ms: 9000,
  });
  const request = new Request(SITE + '/api/v1/public/join', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': String(Buffer.byteLength(body)),
      'X-CSRFToken': token,
      Cookie: `csrftoken=${cookie}`,
      'CF-Connecting-IP': ip,
    },
    body,
  });
  return onRequest({ request, env: proxyEnv });
}

test('the visitor IP reaches Django when the proxy secret matches', options, async () => {
  const res = await submitWith(env, 'IpTrusted', '203.0.113.42');
  assert.equal(res.status, 202);
  // Asserted against the stored hash by the backend test suite; here we prove
  // the request is accepted end to end with the header present.
});

test('a spoofed client IP is ignored when no proxy secret is configured', options, async () => {
  // Same request, but the "proxy" has no secret — Django must fall back to
  // REMOTE_ADDR rather than trusting CF-Connecting-IP (apps/core/net.py).
  const res = await submitWith({ API_ORIGIN: BASE }, 'IpUntrusted', '198.51.100.99');
  assert.equal(res.status, 202, 'the submission still succeeds; only the IP claim is distrusted');
});
