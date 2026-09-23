import { esc, map, when } from "../templates/html.js";
import { pageHero, section, sectionHead, awaitingPanel, moreLink, pendingFlag, avatar } from "../templates/components.js";
import { story, vision, timeline, colophon, mentors, intro } from "../data/about.js";
import { initiatives } from "../data/initiatives.js";
import { faculty, patron, roles, necTeamSize } from "../data/team.js";
import { site } from "../data/site.js";

export default {
  slug: "/about/",
  title: "About",
  description:
    "The Entrepreneurship Cell of PSG Institute of Management — founded 2019, student-run, faculty-guided. Our story, what we run, and what we are for.",
  priority: "0.8",

  render({ assets }) {
    return [
      pageHero({
        kicker: "About · PSGIM E-Cell",
        title: "We turn students into founders",
        lede: "The Entrepreneurship Cell of PSG Institute of Management is a student-run body that has, since 2019, built a small but serious entrepreneurship culture on campus — events, mentors, competitions, and a place for an idea to be taken seriously.",
      }),

      section({
        id: "story",
        inner: `<div class="cols-2">
  <div class="prose">
    <p class="kicker" style="margin-bottom:var(--s-4)">${esc(story.kicker)}</p>
    <h2 class="sr-only" id="story-heading">The story</h2>
    ${map(story.paragraphs, (p) => `<p>${esc(p)}</p>`)}
  </div>
  <div class="prose">
    <p class="kicker" style="margin-bottom:var(--s-4)">What we do</p>
    <dl class="role-list">
      ${map(initiatives, (i) => `<div><dt>${esc(i.tag)}</dt><dd><b>${esc(i.title)}</b> — ${esc(i.summary)}</dd></div>`)}
    </dl>
    <p style="margin-top:var(--s-5)">${moreLink({ label: "All initiatives in detail", href: "/initiatives/" })}</p>
  </div>
</div>`,
      }),

      section({
        id: "vision",
        tone: "tint",
        inner: `${sectionHead({
          id: "vision",
          kicker: vision.kicker,
          heading: vision.heading,
          note: vision.pending ? vision.note : null,
        })}
<p class="statement">${esc(vision.statement)}</p>
<ol class="mission">${map(vision.mission, (m) => `<li><span>${esc(m)}</span></li>`)}</ol>`,
      }),

      section({
        id: "run",
        inner: `${sectionHead({
          id: "run",
          kicker: "How we’re run",
          heading: "Faculty-guided, student-run",
          body: `Two faculty coordinators and the Director oversee the Cell; the working roles below are carried by the core team. The full roster and the ${necTeamSize}-student NEC campaign team are on the team page.`,
          link: { label: "See the whole team", href: "/team/" },
        })}
<div class="faculty-row">
  ${map(faculty, (f) => `<div class="faculty">
    ${avatar({ name: f.name, src: `/team/${f.photo}`, exists: assets.has(`team/${f.photo}`) })}
    <div>
      <div class="faculty__name">${esc(f.name)}</div>
      <div class="faculty__role">${esc(f.role)} · ${esc(f.org)}</div>
    </div>
  </div>`)}
</div>
<p class="patron">Patron — <b>${esc(patron.name)}</b>, ${esc(patron.role)}</p>
<dl class="role-list" style="margin-top:var(--s-6)">
  ${map(roles, (r) => `<div>
    <dt>${esc(r.role)}</dt>
    <dd>${r.name ? `<b>${esc(r.name)}</b> — ` : `<b>Core members</b> — `}${esc(r.remit)}</dd>
  </div>`)}
</dl>`,
      }),

      section({
        id: "mentors",
        tone: "tint",
        inner: `${sectionHead({
          id: "mentors",
          kicker: "Mentors & speakers",
          heading: "Who’s been in the room",
        })}
${
  mentors.length === 0
    ? awaitingPanel({
        heading: "Being confirmed",
        body: "The Cell is compiling the list of founders, operators and alumni who have spoken on campus, with their permission to publish. Real names and photographs will appear here — nothing stands in for them in the meantime.",
      })
    : ""
}`,
      }),

      section({
        id: "timeline",
        inner: `${sectionHead({
          id: "timeline",
          kicker: timeline.kicker,
          heading: timeline.heading,
          note: timeline.pending ? timeline.note : null,
        })}
<dl class="timeline">${map(timeline.entries, (t) => `<div><dt>${esc(t.year)}</dt><dd>${esc(t.what)}</dd></div>`)}</dl>`,
      }),

      section({
        id: "colophon",
        tone: "band",
        inner: `${sectionHead({ id: "colophon", kicker: colophon.kicker, heading: colophon.heading })}
<div class="prose">${map(colophon.paragraphs, (p) => `<p>${esc(p)}</p>`)}
<p style="margin-top:var(--s-5);color:var(--ink-3);font-size:var(--t-sm)">${esc(site.credit.name)} · ${esc(site.credit.role)}</p></div>`,
      }),
    ].join("\n");
  },
};
