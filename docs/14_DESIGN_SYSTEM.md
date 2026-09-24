# 14 — Design System

Formalises what already exists in `web/src/styles/`. The single source of
truth is `tokens.css`; this document describes it — do not diverge.

## Brand

- Name: **PSGIM E-CELL**. Tagline: *Ideas today. Impact tomorrow.*
- Mark: `web/public/logo.png` / `logo@2x.png` (navy spine, turquoise wings).
- Note: README still describes an older blue palette (#0D3B8E / #0077FF); the
  code moved to the logo-sampled navy/turquoise (commit f7f2cb7). **tokens.css wins; README to be corrected.**

## Colour tokens (light / dark)

| Token | Light | Dark | Use |
|---|---|---|---|
| `--paper` | #f5f8fc | #05060a | page ground |
| `--surface` | #ffffff | #0a101e | cards |
| `--ink` / `--ink-2` / `--ink-3` | #0a1b33 / #41546f / #6c7e97 | #fff / #b8b8b8 / #7a7a7a | text hierarchy |
| `--navy` | #002050 | #3567a8 | structure |
| `--accent` | #00b098 | #00b098 | interaction, fills |
| `--accent-ink` | #007070 | #00b8a0 | accent **text** (AA on paper) |
| `--on-accent` | #00120e | #00120e | text on accent (white fails at 2.74:1) |
| `--rule`, `--rule-strong` | | | borders |
| `--band` | #0a1b33 | #000 | dark bands |

Theme via `prefers-color-scheme` + `[data-theme]` override (`ThemeService`).

## Type

Montserrat (300/500/600/700–800), one family. Fluid scale `--t-display …
--t-micro` (clamp). Tracking tokens `--track-*`. Hierarchy by weight/tracking.

## Space, radius, motion

Spacing `--s-1…--s-9` (0.25–6rem); `--section-y` fluid; `--wrap 78rem`,
`--wrap-narrow 46rem`, fluid `--gutter`. Radii tight: 3/6/10px + pill.
Durations 140/260/520/720ms; `--ease-out`, `--ease-spring`. Motion writes only
transform/opacity/custom properties; `prefers-reduced-motion` shows final state.

## Components (existing)

Floating pill navbar (shrinks with scroll), footer, search bar, section
heading, stat tile (count-up), progress bar, pending flag, awaiting panel,
QR generator, buttons/chips (CSS classes in `components.css`), lightbox
(`<dialog>`), custom cursor.

## Platform layer (new)

Same tokens, different density: `--platform-row-h: 40px`, base text
`--t-sm`, radius `--r-md`, no reveal animations, no custom cursor, no video.
Components: data table, form field (16px input on mobile — iOS zoom rule
from Control Room), status chip (one colour per workflow state), confirm
dialog (typed confirmation for destructive actions), empty state, toast.
Breakpoints: phone (base), 640, 1024, 1280 — same tiers the Control Room uses.

## Accessibility baseline

Visible `:focus-visible` ring everywhere, AA contrast (tokens above chosen for
it), semantic landmarks, labelled fields, `<dialog>` for modals, alt text
required on published images.
