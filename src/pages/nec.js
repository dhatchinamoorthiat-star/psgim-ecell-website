import { esc, attr, map, when } from "../templates/html.js";
import { pageHero, section, sectionHead, stat, button, moreLink, personCard, pendingFlag, awaitingPanel } from "../templates/components.js";
import { necIcon } from "../templates/icons.js";
import { nec } from "../data/nec.js";
import { necTeam, necTeamSize } from "../data/team.js";
import { site } from "../data/site.js";

/**
 * The NEC campaign page.
 *
 * The previous version reproduced the national campaign's own visual identity
 * — its blue, its streak graphic, its wordmark treatment. This page carries
 * exactly the same information in PSGIM E-Cell's identity, and is explicit
 * about which parts are E-Cell IIT Bombay's programme and which are ours.
 */
export default {
  slug: "/nec/",
  title: "NEC 2026",
  description:
    "PSGIM E-Cell is competing in the National Entrepreneurship Challenge 2026, run by E-Cell IIT Bombay. The campaign, the team, the timeline, and how to join.",
  priority: "0.9",
  changefreq: "weekly",

  render({ assets }) {
    const has = (photo) => assets.has(`team/${photo}`);

    const heroSection = `<section class="page-hero nec-hero">
  <span class="nec-hero__year" aria-hidden="true">${esc(nec.year)}</span>
  <div class="wrap">
    <div class="nec-hero__inner">
      <p class="kicker">${esc(nec.hero.eyebrow)} ${esc(nec.organiser)}’s national challenge</p>
      <h1 class="nec-hero__title">National Entrepreneurship Challenge <span>${esc(nec.year)}</span></h1>
      <p class="page-hero__lede">${esc(nec.hero.lede)}</p>
      <div class="row" style="margin-top:var(--s-3)">
        ${button({ label: "Join our NEC team", href: "#join", variant: "accent" })}
        ${button({ label: "Official NEC portal", href: nec.portal, variant: "secondary", external: true })}
      </div>
    </div>
  </div>
</section>`;

    return [
      heroSection,

      section({
        id: "about",
        inner: `${sectionHead({
          id: "about",
          kicker: "About",
          heading: nec.about.heading,
          body: nec.about.lead,
        })}
<div class="cols-2">
  <div class="prose"><p>${esc(nec.about.paragraphs[0])}</p></div>
  <div class="prose">${map(nec.about.paragraphs.slice(1), (p) => `<p>${esc(p)}</p>`)}</div>
</div>`,
      }),

      section({
        tone: "band",
        className: "block--tight",
        inner: `<h2 class="sr-only">The campaign in numbers</h2>
<div class="grid grid--4">${map(nec.stats, (s) => stat(s))}</div>`,
      }),

      section({
        id: "goal",
        inner: `${sectionHead({ id: "goal", kicker: "Our goal", heading: nec.goal.heading, body: nec.goal.lead })}
<div class="prose">${map(nec.goal.paragraphs, (p) => `<p>${esc(p)}</p>`)}</div>`,
      }),

      section({
        id: "team",
        tone: "tint",
        inner: `${sectionHead({
          id: "team",
          kicker: "Team",
          heading: `${necTeamSize} students, one campus`,
          body: `The PSGIM E-Cell members running the campaign, led by ${necTeam.lead.name}.`,
          note: necTeam.note,
        })}
<ul class="people">
  ${personCard({ ...necTeam.lead, exists: has(necTeam.lead.photo), lead: true })}
  ${map(necTeam.members, (m) => personCard({ ...m, exists: has(m.photo) }))}
</ul>`,
      }),

      section({
        id: "tracks",
        inner: `${sectionHead({
          id: "tracks",
          kicker: "Tracks",
          heading: "Three tracks — PSGIM is on Basic",
          body: "The portal assigns a track from the E-Cell’s age. This is our first cycle, so we start at the beginning.",
        })}
<div class="tracks">
  ${map(nec.tracks, (t) => `<div class="track${t.ours ? " track--ours" : ""}">
    ${when(t.ours, `<span class="track__badge">PSGIM entry</span>`)}
    <h3>${esc(t.name)}</h3>
    <p>${esc(t.body)}</p>
    ${t.ours ? moreLink({ label: "Join our team", href: "#join" }) : moreLink({ label: "On the NEC portal", href: nec.portal, external: true })}
  </div>`)}
</div>`,
      }),

      section({
        id: "incentives",
        tone: "tint",
        inner: `${sectionHead({
          id: "incentives",
          kicker: "Incentives",
          heading: "What the challenge offers",
          body: `Awarded by ${nec.organiser} to teams across the challenge.`,
        })}
<div class="cards">
  ${map(nec.incentives, (i) => `<div class="card-sm">
    <span class="card-sm__icon" aria-hidden="true">${necIcon[i.title] ?? ""}</span>
    <h3>${esc(i.title)}</h3>
    <p>${esc(i.body)}</p>
  </div>`)}
</div>`,
      }),

      section({
        id: "timeline",
        inner: `${sectionHead({
          id: "timeline",
          kicker: "Timeline",
          heading: `The ${nec.year} cycle`,
          note: nec.timeline.pending ? nec.timeline.note : null,
        })}
<dl class="timeline">${map(nec.timeline.entries, (t) => `<div><dt>${esc(t.when)}</dt><dd>${esc(t.what)}</dd></div>`)}</dl>`,
      }),

      section({
        id: "guidelines",
        tone: "tint",
        inner: `${sectionHead({ id: "guidelines", kicker: "Guidelines", heading: "The rules, briefly" })}
<ul class="guide">${map(nec.guidelines, (g) => `<li><span>${esc(g)}</span></li>`)}</ul>
<p style="margin-top:var(--s-6)">${moreLink({ label: "Full brochure on the NEC portal", href: nec.portal, external: true })}</p>`,
      }),

      section({
        id: "faq",
        inner: `${sectionHead({ id: "faq", kicker: "FAQ", heading: "Questions we get asked" })}
<div class="faq">
  ${map(nec.faq, (f, i) => `<details${i === 0 ? " open" : ""}>
    <summary>${esc(f.q)}</summary>
    <p>${esc(f.a)}</p>
  </details>`)}
</div>`,
      }),

      section({
        id: "join",
        tone: "band",
        inner: `<div class="closer">
  <div>
    <p class="kicker">Join</p>
    <h2 class="closer__title" id="join-heading">${esc(nec.join.lead)}<br>Join the <em>NEC team</em>.</h2>
    <p class="closer__body">${esc(nec.join.body)}</p>
  </div>
  <div class="closer__actions">
    ${button({ label: "Join the Cell", href: "/contact/", variant: "accent", size: "lg" })}
    ${button({ label: "NEC portal", href: nec.portal, variant: "secondary", size: "lg", external: true })}
  </div>
</div>`,
      }),
    ].join("\n");
  },
};
