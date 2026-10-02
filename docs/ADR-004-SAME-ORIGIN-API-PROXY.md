# ADR-004 — Same-Origin API Proxy (Cloudflare Pages Function)

- **Status:** ACCEPTED (documents the implemented function; written retrospectively)
- **Date:** 2026-10-02

## Why this ADR exists

`apps/core/net.py`, `config/settings/base.py`, `functions/api/[[path]].js` and
ADR-009 all reference "ADR-004", but the document itself was never written. The
proxy was implemented; only its decision record was missing. Nothing here is
aspirational — every statement below is verified against the code as it stands,
and against an end-to-end run (`tools/tests/join-e2e.test.mjs`).

## Problem

The Angular site is static, served from Cloudflare Pages. The API is Django on
a separate host (ADR-008, Render). A browser calling that host directly would
mean:

- **Cross-origin cookies.** The session and CSRF cookies would be third-party,
  so they need `SameSite=None; Secure` and are increasingly blocked by default.
- **CORS**, with its preflights and its standing invitation to widen origins
  until something works.
- **A spoofable client IP.** Render gives the backend a public URL. Anything
  that reaches Django directly can set whatever forwarding header it likes, so
  rate limiting and the audit log would record attacker-chosen addresses.

## Decision

Route `/api/*` through a **Cloudflare Pages Function** at
`functions/api/[[path]].js`, so the browser only ever talks to the site's own
origin.

Consequences:

- Cookies stay **first-party**. `SESSION_COOKIE_SAMESITE = "Lax"` is sufficient.
- **No CORS.** `django-cors-headers` is deliberately not installed. If a change
  seems to need CORS, the proxy is being bypassed — fix that instead.
- The backend origin is **configuration, not code**: `API_ORIGIN`. No hostname
  is committed anywhere in this repository.

### Routing and path safety

Only canonical paths are forwarded. The function decodes the path **once**
(matching Django), then requires plain `[A-Za-z0-9._~-]` segments separated by
single slashes. That rejects `//`, `./`, `../`, encoded slashes and double
encoding, rather than rewriting them — rewriting could itself invent a route.
The **original** path is forwarded unchanged, so what was checked is exactly
what Django routes.

The first segment after `/api/v1/` must appear in `ALLOWED_RESOURCES`. This is
an allowlist, so a new top-level API resource is invisible through the proxy
until it is added — a deliberate speed bump. `/api/v1/internal/*` is refused
explicitly in any encoding: the cron tick is called by the scheduler directly,
never through the public site.

### Fail-closed behaviour

| Condition | Result |
|---|---|
| `API_ORIGIN` unset | `503 api_unavailable`, nothing forwarded (**inert by default**) |
| `API_ORIGIN` unparseable | `503 api_unavailable` |
| Path not under `/api/` | `404 not_found` |
| Path non-canonical or malformed encoding | `400 bad_path` |
| Resource not in `ALLOWED_RESOURCES` | `404 not_found` |
| Backend unreachable | `502 api_unreachable` in the standard error shape |

The upstream host always comes from `API_ORIGIN`; the path can never change it.
There is no user-controlled destination, so this is not an open proxy.

### Client-IP trust boundary

The chain is:

```
visitor
  → Cloudflare edge          (sets CF-Connecting-IP)
  → Pages Function           (adds X-Ecell-Proxy-Secret from PROXY_SHARED_SECRET)
  → Django                   (CLIENT_IP_HEADER, verified by apps/core/net.py)
  → client_ip()              (throttling, audit log, JoinSubmission.ip_hash)
```

Django trusts `CLIENT_IP_HEADER` **only** when `PROXY_SHARED_SECRET` is
configured *and* the request carries a matching value, compared with
`hmac.compare_digest`. Any client-supplied copy of that header is deleted by
the function before its own is set, so the forwarded value can only come from
the function.

If either side is unconfigured, the check **fails closed**: Django falls back
to `REMOTE_ADDR`. The consequence is throttling by Cloudflare's edge IP rather
than the visitor's — degraded, never spoofable.

Verified end to end: with the secret set, a submission carrying
`CF-Connecting-IP: 203.0.113.42` stores the hash of that address; with the
secret absent, the same request stores the hash of `REMOTE_ADDR` instead, and
the spoofed value is discarded.

### Why the browser never receives the shared secret

`PROXY_SHARED_SECRET` is read from the Pages Function environment
(`env.PROXY_SHARED_SECRET`) and exists only inside the Worker. It is never
placed in an Angular environment file, never serialised into a response, and
never logged. Function code is not shipped to the browser. A test asserts the
secret appears in neither the response headers nor the body.

### Relationship to CSRF

Because the API is same-origin, Django's standard CSRF applies unchanged. The
browser fetches `GET /api/v1/auth/csrf`, which sets the readable `csrftoken`
cookie; Angular's XSRF interceptor echoes it as `X-CSRFToken`. The public app
configures this at the root injector and `/platform` configures it at route
level, both using `CsrfTokenExtractor` (`web/src/app/core/`) because Angular's
built-in extractor looks for `XSRF-TOKEN`, not Django's `csrftoken`.

The public membership-interest endpoint keeps `csrf_protect`. It is **not**
`csrf_exempt`: it is unauthenticated, not untrusted.

`CSRF_TRUSTED_ORIGINS` must list the **site** origin (the Pages domain), not
the backend's, because that is the origin the browser sends. No wildcards.

### Headers

Hop-by-hop headers (`connection`, `keep-alive`, `proxy-authenticate`,
`proxy-authorization`, `te`, `trailer`, `transfer-encoding`, `upgrade`, `host`)
are stripped before forwarding. `X-Forwarded-Host` and `X-Forwarded-Proto` are
set. On the way back, `server` and `x-powered-by` are removed and
`Cache-Control: no-store` is applied. `Set-Cookie` passes through so the
session stays first-party. Redirects use `redirect: 'manual'` so the browser
sees what the backend actually sent.

A streamed request body is forwarded with `duplex: 'half'`, which the fetch
spec requires. Workers accepts it, and it is what allows the function to be
exercised against a real backend from Node in CI.

## Deployment responsibilities

| Variable | Where | Notes |
|---|---|---|
| `API_ORIGIN` | Cloudflare Pages | Backend origin. Unset ⇒ inert (503). Set for **preview only** until N-1. |
| `PROXY_SHARED_SECRET` | Cloudflare Pages **and** Render | Same random value on both. Never committed. |
| `CLIENT_IP_HEADER` | Render | `CF-Connecting-IP` behind this proxy. Empty ⇒ header never trusted. |
| `CSRF_TRUSTED_ORIGINS` | Render | The site origin. No wildcards. |

Rotation: set the new `PROXY_SHARED_SECRET` on the backend first (it accepts
only one value at a time, so expect a brief window where the IP header is
distrusted — degraded, not broken), then on the Pages Function.

## What this ADR does not decide

- The production backend hostname. It is configuration; this repository must
  never contain it.
- Whether production hosting is approved — that remains gated by N-1 in
  `docs/PHASE_1_AUTHORIZATION.md`.

## Consequences

**Good.** First-party cookies; no CORS surface; one deployable frontend
artefact; the backend origin swappable per environment; an unspoofable client
IP once both halves are configured; inert by default, so an unconfigured
deployment serves a clean 503 instead of leaking a backend.

**Costs.** Every new top-level API resource must be added to
`ALLOWED_RESOURCES` or it 404s through the proxy — a real trap, mitigated only
by tests and this note. The function is a dependency on Cloudflare Pages
Functions specifically. Rate limiting is only as good as the IP it sees, which
means the shared secret is operationally load-bearing rather than optional.
