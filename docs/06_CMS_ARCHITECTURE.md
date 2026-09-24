# 06 — CMS Architecture

## Goal

Replace "edit `*.data.ts` → commit → build → deploy" with
"edit in Platform → draft → review → publish/schedule → site rebuilds itself".

## Structured first, blocks second

| Content | Model | Why |
|---|---|---|
| Event, Speaker, Blog, Initiative, Team profile, Gallery album | **Structured entities** with typed fields | predictable rendering, filtering, SEO |
| About/Origin/Vision/Reach/History/Podcast/Website-AV page bodies, event long description | **Block list** (`ContentVersion.blocks`) of approved block types | editorial flexibility where it helps |
| Nav, footer structure, design, component code | **System** (Technical, in Git) | brief §12 |

Block types (Technical-owned, each = JSON schema in Django + one Angular
renderer component): `hero`, `rich_text` (sanitized markdown subset — no raw
HTML), `image`, `gallery`, `video` (YouTube/Cloudinary URL allow-list),
`speaker_grid`, `team_grid`, `event_details`, `timeline`, `faq`, `stats`,
`testimonials`, `sponsor_logos`, `cta`, `registration`, `announcement`,
`related_content`. Unknown block types are rejected by the API and skipped
(with a console warning) by the renderer.

## Draft/published separation

Each ContentItem points to `published_version_id` and `draft_version_id`.
Editing only ever writes a new draft version. The public API
(`/api/public/*`) reads **only** `published_version`. So an Events Head
changing 15 Dec → 20 Dec leaves the site on 15 Dec until publish.

## Preview

`/platform/preview/:type/:id?version=n` renders the draft with the **same
Angular public components** inside the public layout, plus a "PREVIEW —
not live" banner, `noindex`. Requires `content.view` on that item.

## Publish pipeline

1. Publish (immediate or at `publish_at` via tick) sets `published_version_id`, writes AuditLog.
2. Backend debounces (60 s) and sends a GitHub `repository_dispatch` that runs the normal CI deploy workflow (ADR-009; Direct Upload projects have no native deploy hook).
3. Pages build runs `ng build`; a prerender data loader fetches `/api/public/snapshot` (all published content in one JSON) — replaces the `*.data.ts` imports.
4. On build failure the previous deployment stays live (Pages behaviour); Technical is notified.

The `*.data.ts` files are kept as the **fallback snapshot** until the CMS is
proven, then generated from the DB for local dev (`npm run content:pull`).

## Honesty flag

`is_verified=false` renders the existing *to be confirmed* marker. Publishing
unverified institutional facts requires an explicit checkbox; this preserves
the site's current convention.
