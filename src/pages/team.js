import { esc, map, when } from "../templates/html.js";
import { pageHero, section, sectionHead, avatar, personCard, button, pendingFlag } from "../templates/components.js";
import { faculty, patron, roles, rolesNote, necTeam, necTeamSize } from "../data/team.js";

export default {
  slug: "/team/",
  title: "Team",
  description:
    "Who runs PSGIM E-Cell — faculty coordinators, the patron, the working roles across the core team, and the 23 students on the NEC 2026 campaign.",
  priority: "0.7",

  render({ assets }) {
    const has = (photo) => assets.has(`team/${photo}`);

    return [
      pageHero({
        kicker: "The people",
        title: "Team",
        lede: `Faculty-guided, student-run. Two coordinators, a core team carrying the working roles, and ${necTeamSize} students on the NEC 2026 campaign.`,
      }),

      section({
        id: "faculty",
        inner: `${sectionHead({ id: "faculty", kicker: "Faculty & patron", heading: "Who oversees the Cell" })}
<div class="faculty-row">
  ${map(faculty, (f) => `<div class="faculty">
    ${avatar({ name: f.name, src: `/team/${f.photo}`, exists: has(f.photo) })}
    <div>
      <div class="faculty__name">${esc(f.name)}</div>
      <div class="faculty__role">${esc(f.role)} · ${esc(f.org)}</div>
    </div>
  </div>`)}
</div>
<p class="patron">Patron — <b>${esc(patron.name)}</b>, ${esc(patron.role)}</p>`,
      }),

      section({
        id: "roles",
        tone: "tint",
        inner: `${sectionHead({
          id: "roles",
          kicker: "Working roles",
          heading: "Who does what",
          note: rolesNote,
        })}
<dl class="role-list">
  ${map(roles, (r) => `<div>
    <dt>${esc(r.role)}</dt>
    <dd>${r.name ? `<b>${esc(r.name)}</b> — ` : `<b>Core members</b> — `}${esc(r.remit)}</dd>
  </div>`)}
</dl>`,
      }),

      section({
        id: "nec-team",
        inner: `${sectionHead({
          id: "nec-team",
          kicker: "NEC campaign team",
          heading: `${necTeamSize} students, one campus`,
          body: `The PSGIM E-Cell members running the NEC 2026 campaign, led by ${necTeam.lead.name}.`,
          note: necTeam.note,
          link: { label: "See the NEC campaign", href: "/nec/" },
        })}
<ul class="people">
  ${personCard({ ...necTeam.lead, exists: has(necTeam.lead.photo), lead: true })}
  ${map(necTeam.members, (m) => personCard({ ...m, exists: has(m.photo) }))}
</ul>`,
      }),

      section({
        id: "join",
        tone: "band",
        inner: `<div class="closer">
  <div>
    <p class="kicker">Open roles</p>
    <h2 class="closer__title" id="join-heading">The team grows <em>every term</em>.</h2>
    <p class="closer__body">Content, design, events, outreach, analytics — and the NEC campaign team. Tell us which one sounds like you.</p>
  </div>
  <div class="closer__actions">${button({ label: "Join the Cell", href: "/contact/", variant: "accent", size: "lg" })}</div>
</div>`,
      }),
    ].join("\n");
  },
};
