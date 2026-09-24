/**
 * Same-origin API proxy (ADR-004) — Cloudflare Pages Function for /api/*.
 *
 * The browser only ever talks to the site's own origin, so session and CSRF
 * cookies stay first-party and no CORS is needed. This function forwards
 * /api/* to the Django backend named by the API_ORIGIN environment variable.
 *
 * INERT BY DEFAULT: without API_ORIGIN it answers 503 and forwards nothing.
 * Set API_ORIGIN only in the Pages *preview* environment until production
 * hosting is approved (N-1 in docs/PHASE_1_AUTHORIZATION.md).
 *
 * Backend settings that go with it: CSRF_TRUSTED_ORIGINS=<site origin>,
 * CLIENT_IP_HEADER=CF-Connecting-IP.
 */

// Headers that describe one network hop and must not be forwarded.
const HOP_BY_HOP = ['connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade', 'host'];

function error(status, code, message) {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

export async function onRequest({ request, env }) {
  const url = new URL(request.url);

  // The cron tick endpoint is called by the scheduler directly, never through the public site.
  if (url.pathname.startsWith('/api/v1/internal/')) {
    return error(404, 'not_found', 'Not found.');
  }

  const origin = env.API_ORIGIN;
  if (!origin) {
    return error(503, 'api_unavailable', 'The platform API is not configured for this deployment.');
  }

  const target = new URL(url.pathname + url.search, origin);
  const headers = new Headers(request.headers);
  for (const h of HOP_BY_HOP) headers.delete(h);
  headers.set('X-Forwarded-Host', url.host);
  headers.set('X-Forwarded-Proto', url.protocol.replace(':', ''));
  // CF-Connecting-IP passes through untouched; Django trusts it only when CLIENT_IP_HEADER is set.

  const hasBody = !['GET', 'HEAD'].includes(request.method);
  let upstream;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? request.body : undefined,
      redirect: 'manual', // let the browser see redirects as the backend sent them
    });
  } catch {
    return error(502, 'api_unreachable', 'The platform API could not be reached. Try again shortly.');
  }

  const response = new Response(upstream.body, upstream);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
