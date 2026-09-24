# 18 — Testing Strategy

Current state: `web/` has Vitest configured but essentially no tests;
Control Room has `scripts/verify-*.mjs` smoke scripts, no test suite.

## Backend (pytest + pytest-django)

- Model tests: constraints (one owner vertical per event, one current year, last super admin).
- **Permission tests — mandatory, table-driven**: for every endpoint × every seeded role × scope (own vertical / other vertical / global), assert expected 2xx/403/404. Generated from `04_PERMISSION_MATRIX.md` so doc and code can't drift.
- **Escalation tests**: Events Head calling `/role-assignments`, `/verticals`, `/settings`, `/audit` → 403 + DENIED audit row; Vertical Head granting themselves or others a global role → 403; Admin Head granting SUPER_ADMIN → 403; removing last super admin → 409; self-approval → 403.
- Workflow tests: every legal/illegal transition; draft never leaks to `/public/*`; scheduled publish at boundary times in Asia/Kolkata (incl. midnight IST = 18:30 UTC).
- Auth tests: rate limit, forgot-password no-oracle, session expiry, CSRF required.
- URL coverage test: every route declares a permission.

## Frontend (Vitest)

Component tests for block renderers and forms; guard/route tests; permission-aware nav snapshots per role.

## End-to-end (Playwright, CI on preview deploy)

Login · member sees only own tasks · Events Head creates & edits event · adds speaker + image · previews · submits · Admin approves & schedules · tick publishes · public page shows new value after rebuild (stubbed hook in CI) · admin changes a role (audited).

## Parity (migration)

Scripted comparison of prerendered HTML text vs baseline tag build; route status check; Lighthouse CI budgets (perf ≥ baseline, a11y ≥ 95).

## Gate

A phase is not "done" on compile — it is done when the phase's tests, the parity checklist and a manual responsive check (375 / 768 / 1280) pass.
