# 13 — Frontend Architecture

## Current (keep)

Angular 22.1, standalone components, signals, `provideRouter` with lazy
`loadComponent`, `@angular/ssr` used for build-time prerender of every route
(`app.routes.server.ts` → `RenderMode.Prerender` on `**`), custom
`TrailingSlashUrlSerializer`, CSS layered as tokens/base/layout/components/sections/motion.
No Tailwind, no component library. Vitest configured.

## Target structure (additive)

```
web/src/app/
  core/                 (existing) + api/ (typed clients), auth/ (session, permission signals)
  public/               (move existing features/ here in Phase 2 — no URL change)
  platform/
    shell/              sidebar + topbar layout, dense tokens
    dashboard/ events/ content/ blogs/ media/ tasks/ requests/ kb/ notifications/ profile/
    admin/              users, roles, verticals, years, succession, approval-rules, audit, settings
    preview/
  shared/ui/            (existing) + blocks/ (one renderer per CMS block type)
```

## Routing

- Public routes unchanged. `/platform/**` is one lazy `loadChildren`, marked `RenderMode.Client` so it is never prerendered, and `noindex`.
- Guards: `authGuard` (session), `permGuard('event.edit')` — **UX only**; the API re-checks everything.
- Navigation items are filtered by `AuthService.can(perm, scope)` computed from `/auth/me`.

## State & data

Signals for UI state; `HttpClient` + RxJS for requests, converted with
`toSignal` at component edges. Business rules (workflow, permissions) live in
the backend; components never decide "can publish" beyond hiding a button.
Typed models generated from the OpenAPI schema (`openapi-typescript`, dev-only
dependency) to avoid drift.

## Content loading for the public site

`core/data/*.data.ts` imports are replaced by a `ContentStore` whose values
come from (a) `/api/public/snapshot` during prerender, (b) `TransferState` in
the browser. Components keep their current shapes (`models.ts` interfaces are
the contract), so templates barely change.

## Dependency policy

Add only: `openapi-typescript` (dev). Angular CDK for platform dialogs/menus/
drag-drop reorder (justified: accessible overlays, media reorder). GSAP only if
a specific animation cannot be done in CSS. No Three.js.
