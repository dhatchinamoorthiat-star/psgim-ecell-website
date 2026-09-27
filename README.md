# PSGIM E-Cell — website

The website of the Entrepreneurship Cell, PSG Institute of Management, Coimbatore.

An Angular app (standalone components, signals, prerendered to static HTML)
that lives in **`web/`**. Prerendering means the deployed site is still plain
static HTML/CSS/JS per route — there is no server to run in production — but
building it now requires `npm install`, unlike the old hand-rolled generator
this replaced.

```bash
npm install --prefix web   # once
npm run dev                 # ng serve, live-reload at http://localhost:4200
npm run build                # ng build + postbuild → web/dist/web/browser
```

Deploy `web/dist/web/browser` to Cloudflare Pages. Build command
`npm run build`, output directory `web/dist/web/browser` (already set in
`wrangler.toml`).

A separate app, `ecell/` (Next.js + Supabase), is the real event-registration
/ check-in / admin "Control Room" — it deploys independently to Vercel and is
untouched by anything in this section.

### The platform (in development — branch `platform/phase-1`)

The PSGIM E-Cell Platform is being built alongside the site: a Django API in
**`backend/`** and a members' area at **`/platform`** inside the same Angular
app. It is not deployed. The architecture and decisions are in
[`docs/`](docs/README.md); how to run it locally is in
[`docs/PHASE_1_IMPLEMENTATION_NOTES.md`](docs/PHASE_1_IMPLEMENTATION_NOTES.md).
The public pages below are unchanged by it.

---

## Editing content — you do not need to touch the design

Everything a visitor reads lives in **`web/src/app/core/data/`**, as typed
TypeScript modules. Change a value there and rebuild; no template or
stylesheet needs to change.

| File | What it holds |
| --- | --- |
| `site.data.ts` | Name, address, email, social accounts, navigation, the notice bar |
| `about.data.ts` | Homepage intro, the story, vision & mission, timeline, mentors, testimonials |
| `initiatives.data.ts` | The six programmes, and the four stages of the journey spine |
| `events.data.ts` | The calendar |
| `team.data.ts` | Faculty, patron, working roles, the NEC campaign team |
| `stats.data.ts` | The four homepage figures, and the NEC drive targets |
| `gallery.data.ts` | Gallery tiles and albums |
| `nec.data.ts` | Everything on the NEC page |
| `roadmap.data.ts` | What's building, for `/soon/` |

Interfaces for all of the above live in `web/src/app/core/models/models.ts`.

### The "to be confirmed" convention

Anything the team has not yet verified carries `pending: true`. The site then
renders it with a visible *to be confirmed* marker (`ui-pending-flag`) instead
of presenting it as established fact:

```ts
email: { value: "ecell@psgim.ac.in", pending: true },
```

Once the office confirms it, drop the flag:

```ts
email: { value: "ecell@psgim.ac.in" },
```

This is deliberate. An institutional site that states an unverified figure
plainly is worse than one that says it is still checking.

### Things that are empty on purpose

`mentors` and `testimonials` in `about.data.ts` are empty arrays. The
`ui-awaiting-panel` component renders an honest "being confirmed" message
instead of inventing people or quotes. Add real entries and the section
replaces the panel on its own.

The **interest form** is the same: `site.contact.interestForm.value` is
`null`, so `/contact/` shows an explanation instead of a form. Set it to a
real submission URL and the full form should render and post there — don't
re-add a form that collects names and emails and throws them away.

### Adding a photograph

There is currently no photo for any team member or gallery tile — every
person renders as initials, every gallery tile as a labelled placeholder.
When real photos exist, add an `image`/`photo` path convention under
`web/public/` and wire the corresponding component to check for it before
falling back — mirroring the honest-placeholder behavior already in place.
Nothing should ever render as a broken image.

### Adding an event

Add an object to the `events` array in `events.data.ts`. Upcoming vs. past is
**derived from the date** at build/render time by `splitEvents()` — never
hardcode "Upcoming", or it will be wrong within weeks.

```ts
{
  id: "founders-on-campus-nov",
  title: "Founders on Campus — …",
  date: "2026-11-14",        // ISO. endDate too, for multi-day events.
  time: "6:00 PM",
  venue: "Auditorium",
  audience: "Open to all",
  summary: "…",
  registration: "open",      // "open" | "closed" | null
  turnout: null,             // fill in afterwards
}
```

Rebuild and deploy regularly — the site's sense of what is next only updates
when it is rebuilt (routes are prerendered at build time).

---

## How it is put together

```
web/
  src/app/
    core/
      models/          typed interfaces for every content shape
      data/             all content (above)
      services/         ThemeService, SeoService, QrService
      directives/        RevealOnScrollDirective, CountUpDirective
    shared/ui/          pending-flag, awaiting-panel, section-heading,
                        stat-tile, progress-bar, qr-generator components
                        (buttons/chips are CSS classes in components.css)
    layout/             navbar, footer, page-shell
    features/           home, about, initiatives, events, team, gallery,
                        nec, contact, soon, control — one per route
    app.routes.ts        the 10 routes, lazy-loaded
    app.routes.server.ts prerender config (prerenders everything)
  src/styles/
    tokens.css          colour, type scale, spacing, motion — the only file
                        with raw colour values in it
    base.css             reset and typographic primitives
    layout.css           containers, section rhythm, grids
    components.css       the reusable parts (incl. navbar/footer)
    sections.css          page compositions
    motion.css            reveal animation and the reduced-motion rules
  public/               logo, icons, og.png, _headers, vendor/qrcode-generator.js
  tools/postbuild.mjs   writes sitemap.xml + robots.txt into dist/web/browser
                        after `ng build`
```

### Design system in one paragraph

*Ideas today. Impact tomorrow.* The two brand colours are sampled from the
pixels of the logo itself (`web/public/logo@2x.png`) — the mark's navy spine
and turquoise wings. Light-mode values below; dark mode overrides some of them.

| | |
| --- | --- |
| Navy | `#002050` — `--navy` (structure) |
| Turquoise | `#00B098` — `--accent` (interaction, fills) |
| Deep teal | `#007070` — `--accent-ink` (accent-coloured **text**; clears 4.5:1 on paper) |
| Near-black | `#00120E` — `--on-accent` (text on turquoise; white fails at 2.74:1) |
| Light teal | `#00B8A0` / `#4DD9C4` — `--ocean` / `--sky` (graphics) |
| Pale teal | `#E1F7F2` — `--accent-soft` |
| Typeface | Montserrat — Light 300 / Medium 500 / SemiBold 600 / Bold 700–800 |

The brand colours are held to the role of accent: a near-black navy (`--ink`)
and cool paper carry the page, and turquoise is spent on the things that should feel live —
the kicker rule, the active nav indicator, the emphasised word in the hero, a
reached stage on the journey spine. Hierarchy comes from weight and tracking
within one family rather than from mixing typefaces, which is also why the
whole site needs a single webfont. Corners are tight (3–10px) to echo the
mark's straight cuts.

**All colour lives in `web/src/styles/tokens.css`.** If you find yourself
typing a hex value anywhere else, add a token instead. Dark mode is a second
block in the same file, applied via `[data-theme]` and toggled by
`ThemeService`.

### The journey spine

The homepage's signature section is the four stages an idea moves through at
the Cell, threaded on one line that fills as you scroll (`--arc-progress`,
written by a scroll listener, reduced-motion-aware). Each stage lists the real
programmes at that point, read from `initiatives.data.ts` via each
initiative's `stage` field — so the showpiece cannot drift out of sync with
what the Cell actually runs. Add a programme, give it a stage, and it appears.

### /control/ and /nec/ — the QR generator

`/control/` is an internal tool: paste a link or any text into the shared
`ui-qr-generator` component, get a code with the E-Cell mark in the middle,
download a PNG. `?q=<url-encoded>` prefills the box. `/nec/` embeds the same
component, prefilled with the NEC page URL.

It runs entirely in the browser — the text is never uploaded. Encoding is the
vendored `web/public/vendor/qrcode-generator.js` (Kazuhiko Arase, MIT), loaded
as a global via a `<script>` tag — not an npm package.

**Why the codes survive having a logo on them:** error correction is pinned to
level **H** (~30% of the code recoverable), the mark covers ~22% of the area,
and the 4-module quiet zone is preserved. Those three together leave real
margin for glare, wear and bad printing — but it is reliability, not a
guarantee, which is why the page says to test before printing.

**Two things that will bite you if you change this:**

1. The encoder defaults to a one-byte-per-character function that silently
   mangles anything outside ASCII — an em dash becomes a control character and
   Tamil is destroyed. `QrService` switches it to the bundled UTF-8 encoder on
   startup. Don't remove that.
2. Module size is floored to whole pixels, so the canvas is usually a little
   smaller than the size you picked. That is deliberate: fractional modules
   land on different pixel boundaries and produce codes that scan badly.

`/control/` is `noindex, nofollow` (set via `SeoService`), which keeps it out
of `sitemap.xml` and adds a `Disallow` line to `robots.txt`. That is **not**
access control — this is a static site with no accounts, so anyone with the
URL can open it. Don't put anything confidential there.

### Accessibility and motion

- One visible focus ring everywhere; nothing removes an outline without replacing it.
- The lightbox is a `<dialog>`, so focus trapping and Escape come from the platform.
- Counters (`CountUpDirective`) put the real number in the markup and restore it when the animation ends; the element is `aria-hidden` only while it is counting.
- `prefers-reduced-motion` skips reveal/count-up animation and shows the final state immediately — reduced motion can never leave content stuck invisible.
- Scroll effects only ever write `transform`, `opacity` or a custom property.

### Browser support

Modern evergreen browsers. `<dialog>`, `:focus-visible`, `color-mix()` and
CSS nesting-free plain selectors are all used; the lightbox checks for
`showModal` before binding.
