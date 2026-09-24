# 11 — Knowledge Base

First-class module at `/platform/kb`. Per-vertical spaces plus an
organisation-wide space.

- Article: markdown body (same sanitiser as CMS), category (SOP, guide, template, checklist, report, onboarding, process), attachments (MediaAsset documents), tags, owner vertical, visibility (vertical-only / all members).
- Versioned like CMS content; no public publishing — internal only.
- Search: Postgres full-text (`SearchVector` on title+body); no external search service.
- "Review due" date per article; tick notifies owners when SOPs go stale.

## Seed articles (to be written by humans, not generated)

| Space | Articles |
|---|---|
| Events | Event SOP, speaker checklist, venue checklist, event report template (Control Room report format exists — reuse) |
| Technical | Deployment guide (from `16_DEPLOYMENT.md`), CMS guide, Git guide, incident guide, environment setup, handover (from doc 17) |
| All | Onboarding for new members, how to use the platform |

Brief §33: institutional content is human-authored; AI may only assist
(proofread/summarise) and never auto-publishes.
