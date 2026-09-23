# Content plan — from the team's handwritten brief

Source: a photo of a notebook page, two separate lists. Read carefully
against what the site already has (`web/src/app/features/*`,
`web/src/app/core/data/*.data.ts`) so nothing below duplicates an existing
page by accident.

Cross-checked the "Reach" pattern against ecell.in (E-Cell IIT Bombay) — a
stats strip (Cities / Startups / Students) under the hero — only to confirm
the *shape* of that section. Not copying their design; this project
deliberately broke from that look already (see `README.md`).

---

## List 1 — Website sections

The brief, as read:

```
1. Origin
2. Our vision, mission
3. Reach
4. Spotlight
5. History

Our initiatives
1. Podcast
2. Website AV
3. Gallery
4. Meet our team, faculties
5. Contact
```

### Already on the site — no new page needed

| Item | Where it already lives |
| --- | --- |
| Origin | `About` → Story (`about.data.ts` → `story`) |
| Our vision, mission | `About` → Vision & mission (currently `pending: true` — drafted, not signed off) |
| History | `About` → Timeline (currently `pending: true` — dates marked illustrative) |
| Gallery | `Gallery` page |
| Meet our team, faculties | `Team` page + `About` → faculty block |
| Contact | `Contact` page |

**Action for these six: none on the build side.** The team's job is
confirming the pending items — real vision/mission wording, real timeline
dates — so the `pending: true` flag can come off in `about.data.ts`.

### Genuinely new

**Reach** — not a page, a section. The stats block already exists in two
places (`stats.data.ts` on the homepage, the drive/targets block on `NEC`)
but nothing pulls them into one "this is our reach" statement the way
ecell.in's Cities/Startups/Students strip does. Proposed:

```ts
// reach.data.ts
export const reach = {
  note: "...", // pending / illustrative, until confirmed
  metrics: [
    { label: "Students reached", value: null },   // fill in
    { label: "Events run",       value: null },
    { label: "Instagram",        value: 108 },     // already tracked in stats.data.ts
    { label: "LinkedIn",         value: 414 },     // already tracked in stats.data.ts
  ],
};
```
Placement: a new section on `About`, right after Vision & Mission — reach is
evidence for the mission statement, so it reads better directly after it
than as a standalone page.

**Spotlight** — not on the site at all yet. Common pattern on E-Cell-type
sites: a rotating feature on one founder/alumnus/mentor — "who we've
produced or hosted," distinct from the full Team roster. Needs:

```ts
// spotlight.data.ts
export const spotlight = {
  person: { name: "", role: "", photo: "", quote: "", link: "" },
  pending: true, // no real spotlight subject confirmed yet
};
```
Placement: could be its own page, or a featured card on `About`. Given it'll
often be empty (spotlights rotate), I'd make it a section on `About` that
simply doesn't render when `pending`, rather than a page that's blank most
of the time.

**Podcast** — not on the site. A genuinely new content type, not a copy of
an existing page. Needs:

```ts
// podcast.data.ts
export const podcast = {
  name: "",              // show name
  platforms: { spotify: "", youtube: "", apple: "" },
  episodes: [],          // { title, date, embedUrl, summary }
  pending: true,
};
```
Placement: own page (`/podcast/`), linked from nav once there's at least one
real episode — an empty podcast page undersells the site.

**"Website AV"** — this is the one line I can't place with confidence. Two
readings, and they lead to different work:

1. **A video/AV content section** on the site (event highlight reels,
   promo videos) — sits alongside Podcast as a second new content type.
2. **Credit line** for who built the website/AV — a footer or About credit,
   not a content section at all (the footer already carries
   `site.credit`, so this could just be adding an AV-team name there).

I've assumed reading 1 below since it fits the "Our initiatives" grouping
better, but this is worth a one-line confirmation before I build it.

---

## List 2 — Grand Inauguration (a launch event, not a nav item)

```
Videos: [name], Uma ma'am, Vijay sir
LinkedIn, Insta, Website, YouTube
Grand launch — Podcast & clip
AV video of E-Cell
Core committee
```

This reads as an **operational checklist for a launch event**, not new
website navigation — the natural home for it is the existing `Events`
system, not a new permanent page:

1. **Add it as a real event** in `events.data.ts` — "Grand Inauguration,"
   date, venue — same as any other event. It'll show on `/events/` and the
   homepage "next up" strip once the date is real.
2. **Videos** — the three names in the note: two look like they match
   people already in `team.data.ts` —
   - "Vijay sir" → likely **Dr. Vijay Vardhan**, already listed as Faculty
     Coordinator
   - one name reads as "Sridhya" → possibly **Dr. Srividya**, already
     listed as Director/patron
   - **"Uma ma'am" doesn't match anyone currently in `team.data.ts`.**
     Before this goes anywhere public, I'd want the team to confirm all
     three spellings/roles directly — misattributing a faculty member's
     name or title on a public site is the kind of mistake that's hard to
     walk back.
3. **LinkedIn / Insta / Website / YouTube** — a promotion checklist
   (post the announcement on each), not something to build — operational,
   not code.
4. **Podcast & clip / AV video** — the first real content for the
   `podcast.data.ts` / AV section above, timed to the launch. This is the
   natural reason those two sections stop being empty.
5. **Core committee** — this is the trigger to replace the `roles.data.ts`
   placeholder ("Core members" — no names) with the real committee list,
   and to fill in `necTeam` in `team.data.ts` for real if it's still
   placeholder photos.

---

## What I'd actually build first

In order of "unblocks the most other things":

1. **Core committee names** into `team.data.ts` / `roles.data.ts` — every
   other section (Spotlight, Videos, credits) refers back to real people,
   so this is the one true dependency.
2. **Reach** section on About — data already exists in `stats.data.ts`,
   this is mostly composition, not new content to collect.
3. **Grand Inauguration** as a real `events.data.ts` entry.
4. **Podcast** page, once there's a first episode to point at — building it
   before that exists just means another `pending` panel.
5. **Spotlight** — lowest priority; it's the one section that's fine to
   leave for later without leaving a visible gap.

## Open questions for the team (before I write copy or code)

- **"Website AV"** — video content section, or a credit line? (see above)
- **The three names for Grand Inauguration videos** — exact spelling and
  title for each, so nothing gets misattributed
- **Podcast** — does one exist yet, or is this the plan to start one? If
  it's still an idea, the page should say "coming soon" (same pattern as
  `/soon/`) rather than imply episodes exist.
