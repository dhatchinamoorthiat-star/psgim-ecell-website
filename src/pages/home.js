import { esc, attr, map, when, formatDate, splitEvents } from "../templates/html.js";
import {
  button, moreLink, sectionHead, section, stat, initiativeRow, eventItem, galleryTile, pendingFlag,
} from "../templates/components.js";
import { arrow } from "../templates/icons.js";
import { site } from "../data/site.js";
import { hero, intro } from "../data/about.js";
import { initiatives, stages } from "../data/initiatives.js";
import { events, eventsNote } from "../data/events.js";
import { stats, drive } from "../data/stats.js";
import { gallery } from "../data/gallery.js";

/**
 * The homepage.
 *
 * Reading order is the argument: what this is → how big it is → how an idea
 * actually moves through the Cell (the arc) → the programmes → the next dates
 * → what we are pushing for → come in.
 */
export default {
  slug: "/",
  title: "Home",
  description: site.description,
  priority: "1.0",
  changefreq: "weekly",

  render({ assets }) {
    const { upcoming, past } = splitEvents(events);
    const next = upcoming[0];

    /* Hero ------------------------------------------------------------- */
    // "founders" is the italic word: the single emphasis in the type system,
    // and the thing the whole site is about.
    const headline = esc(hero.headline).replace("founders", "<em>founders</em>");

    const heroStrip = next
      ? `<div class="hero__strip">
  <p class="hero__strip-label">Next up</p>
  <p class="hero__strip-title">${esc(next.title)}</p>
  <p class="hero__strip-meta">${esc(formatDate(next.date).day)} ${esc(formatDate(next.date).month)}${when(next.time, ` · ${esc(next.time)}`)}</p>
</div>`
      : `<div class="hero__strip">
  <p class="hero__strip-label">Calendar</p>
  <p class="hero__strip-title">The next term's dates are being confirmed.</p>
  <p class="hero__strip-meta"><a class="more" href="/events/"><span>See past events</span></a></p>
</div>`;

    const heroSection = `<section class="hero">
  <div class="hero__grid" aria-hidden="true"></div>
  <div class="wrap">
    <div class="hero__inner">
      <p class="kicker">${esc(hero.kicker)}</p>
      <h1 class="hero__title">${headline}</h1>
      <p class="hero__lede">${esc(hero.lede)}</p>
      <div class="hero__actions">
        ${button({ label: "Join the Cell", href: "/contact/", size: "lg" })}
        ${button({ label: "What we run", href: "/initiatives/", variant: "secondary", size: "lg" })}
      </div>
    </div>
    ${heroStrip}
  </div>
</section>`;

    /* Intro ------------------------------------------------------------ */
    const introSection = section({
      id: "what",
      inner: `<div class="cols-2">
  <div class="stack">
    <p class="kicker">${esc(intro.kicker)}</p>
    <h2 class="statement" id="what-heading">${esc(intro.headline)}</h2>
  </div>
  <div class="prose">
    ${map(intro.body, (p) => `<p>${esc(p)}</p>`)}
    <p style="margin-top:var(--s-5)">${moreLink({ label: "Read the full story", href: "/about/" })}</p>
  </div>
</div>`,
    });

    /* Stats ------------------------------------------------------------ */
    const statsSection = section({
      tone: "band",
      className: "block--tight",
      reveal: true,
      labelledBy: null,
      inner: `<h2 class="sr-only">The Cell in numbers</h2>
<div class="grid grid--4">${map(stats, (s) => stat(s))}</div>`,
    });

    /* The arc — signature ---------------------------------------------- */
    const arcSection = `<section class="block arc" id="arc" aria-labelledby="arc-heading" data-reveal data-arc>
  <div class="wrap">
    ${sectionHead({
      id: "arc",
      kicker: "How it works",
      heading: "From a thought in a corridor to something worth backing",
      body: "Four stages, and a programme at every one of them. You can join at any point — most people arrive somewhere in the middle.",
    })}
    <div class="arc__track">
      <span class="arc__line" aria-hidden="true"></span>
      ${map(stages, (s) => {
        const progs = initiatives.filter((i) => i.stage === s.id);
        return `<div class="arc__stage">
        <span class="arc__node" aria-hidden="true">${esc(s.index)}</span>
        <div>
          <h3 class="arc__label">${esc(s.label)}</h3>
          <p class="arc__note">${esc(s.note)}</p>
        </div>
        <div class="arc__progs">
          ${map(progs, (p) => `<a class="arc__prog" href="${attr(p.href ?? `/initiatives/#${p.id}`)}">${esc(p.title)}</a>`)}
        </div>
      </div>`;
      })}
    </div>
  </div>
</section>`;

    /* Initiatives ------------------------------------------------------ */
    const initSection = section({
      id: "initiatives",
      tone: "tint",
      inner: `<div class="split">
  ${sectionHead({
    id: "initiatives",
    kicker: "Our initiatives",
    heading: "What we run, every year",
    body: "Programmes repeat each academic year, so a first-year can follow the whole arc before they graduate.",
    link: { label: "All initiatives", href: "/initiatives/" },
  })}
  <ul class="inits">${map(initiatives, initiativeRow)}</ul>
</div>`,
    });

    /* Calendar --------------------------------------------------------- */
    const shown = [...upcoming.slice(0, 2), ...past.slice(0, 2)];
    const calendarSection = section({
      id: "calendar",
      inner: `${sectionHead({
        id: "calendar",
        kicker: "Calendar",
        heading: "What’s on",
        body: "The next few dates, and the last few that happened.",
        note: eventsNote,
        link: { label: "All events", href: "/events/" },
      })}
<ul class="events">${map(shown, (e) => eventItem(e, { past: !upcoming.includes(e) }))}</ul>`,
    });

    /* The drive -------------------------------------------------------- */
    const driveSection = section({
      id: "drive",
      tone: "band",
      inner: `${sectionHead({
        id: "drive",
        kicker: "Where we’re headed",
        heading: "Targets for this drive",
        body: "Where the Cell stands against the goals set for the NEC cycle, reported to the faculty coordinators every week.",
      })}
<div class="drive">
  ${map(drive.targets, (t) => {
    const pct = Math.max(0, Math.min(1, t.now / t.target));
    return `<div class="figure">
    <span class="figure__label">${esc(t.label)}</span>
    <span class="figure__value">
      <span data-count="${attr(t.now)}" data-suffix="">${esc(t.now.toLocaleString("en-IN"))}</span>
      <span class="figure__target">→ ${esc(t.target.toLocaleString("en-IN"))}</span>
    </span>
    <span class="figure__bar" role="img" aria-label="${attr(`${t.now} of a ${t.target} target`)}"><span style="--pct:${pct.toFixed(3)}"></span></span>
    <span class="figure__note">${esc(t.detail)}</span>
  </div>`;
  })}
</div>
<p style="margin-top:var(--s-6)">${pendingFlag(drive.note)}</p>`,
    });

    /* Gallery preview -------------------------------------------------- */
    const preview = gallery.slice(0, 4).map((g) => ({ ...g, exists: assets.has(`gallery/${g.file}`) }));
    const gallerySection = section({
      id: "gallery",
      tone: "tint",
      inner: `${sectionHead({
        id: "gallery",
        kicker: "Gallery",
        heading: "From the floor",
        link: { label: "Full gallery", href: "/gallery/" },
      })}
<ul class="tiles">${map(preview, (g, i) => galleryTile(g, i))}</ul>`,
    });

    /* Closer ----------------------------------------------------------- */
    const closerSection = section({
      id: "join",
      tone: "band",
      inner: `<div class="closer">
  <div>
    <p class="kicker">Get involved</p>
    <h2 class="closer__title" id="join-heading">You don’t need a finished idea.<br>You need one <em>worth testing</em>.</h2>
    <p class="closer__body">Open to every department and both years. Come to a session, bring a half-formed thought, and leave with a next step.</p>
  </div>
  <div class="closer__actions">
    ${button({ label: "Join the Cell", href: "/contact/", variant: "accent", size: "lg" })}
    ${button({ label: "See the calendar", href: "/events/", variant: "secondary", size: "lg" })}
  </div>
</div>`,
    });

    return [
      heroSection,
      introSection,
      statsSection,
      arcSection,
      initSection,
      calendarSection,
      driveSection,
      gallerySection,
      closerSection,
    ].join("\n");
  },
};
