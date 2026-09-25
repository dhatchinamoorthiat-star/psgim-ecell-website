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
 *
 * PATH SAFETY (review finding F2). Django percent-decodes the path once and
 * routes case-sensitively, so the proxy must judge the path the way Django
 * will see it. Rather than rewriting ambiguous paths (which could itself
 * create a new route), it REJECTS them and forwards only paths that are
 * already canonical:
 *   1. decode once (malformed encoding → 400);
 *   2. reject anything that is not plainly [A-Za-z0-9._~-] segments separated
 *      by single slashes — this rules out //, ./ and ../ segments, encoded
 *      slashes/backslashes/dots-as-traversal, and double encoding;
 *   3. allow only the known public resources (case-insensitive comparison);
 *      /api/v1/internal/* is never among them and is refused explicitly too.
 * The ORIGINAL path is forwarded unchanged, so what was checked is exactly
 * what Django routes. The upstream host always comes from API_ORIGIN.
 */

// Public API resources (first segment after /api/v1/). Add new Phase 2+ resources here.
const ALLOWED_RESOURCES = new Set([
  'auth',
  'users',
  'permissions',
  'roles',
  'role-assignments',
  'verticals',
  'academic-years',
  'memberships',
  'audit',
  'settings',
  'schema',
  'docs',
]);

const SEGMENT = /^[A-Za-z0-9._~-]+$/;

// Headers that describe one network hop and must not be forwarded.
const HOP_BY_HOP = ['connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade', 'host'];
// Backend implementation details not worth advertising.
const STRIP_RESPONSE = ['server', 'x-powered-by'];

function error(status, code, message) {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

/**
 * Decide whether a request path may be forwarded.
 * Returns null when allowed, or a Response explaining the refusal.
 */
export function checkPath(rawPathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(rawPathname);
  } catch {
    return error(400, 'bad_path', 'Malformed request path.');
  }
  // After ONE decode (what Django does) the path must be plain and canonical.
  if (!decoded.startsWith('/api/')) return error(404, 'not_found', 'Not found.');
  const segments = decoded.slice(1).split('/');
  // A single trailing slash would give an empty last segment; the API has no trailing slashes.
  if (segments.some((s) => s === '' || s === '.' || s === '..' || !SEGMENT.test(s))) {
    return error(400, 'bad_path', 'Malformed request path.');
  }
  const [api, version, resource] = segments.map((s) => s.toLowerCase());
  if (api !== 'api' || version !== 'v1' || resource === undefined) return error(404, 'not_found', 'Not found.');
  // The cron tick endpoint is called by the scheduler directly, never through the public site.
  if (resource === 'internal' || !ALLOWED_RESOURCES.has(resource)) return error(404, 'not_found', 'Not found.');
  return null;
}

export async function onRequest({ request, env }) {
  const url = new URL(request.url);

  const refused = checkPath(url.pathname);
  if (refused) return refused;

  const origin = env.API_ORIGIN;
  if (!origin) {
    return error(503, 'api_unavailable', 'The platform API is not configured for this deployment.');
  }

  let upstreamOrigin;
  try {
    upstreamOrigin = new URL(origin).origin;
  } catch {
    return error(503, 'api_unavailable', 'The platform API is not configured for this deployment.');
  }
  // The path is canonical (checked above), so it cannot change the host; assert it anyway.
  const target = new URL(url.pathname + url.search, upstreamOrigin);
  if (target.origin !== upstreamOrigin) return error(400, 'bad_path', 'Malformed request path.');

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
  for (const h of STRIP_RESPONSE) response.headers.delete(h);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
