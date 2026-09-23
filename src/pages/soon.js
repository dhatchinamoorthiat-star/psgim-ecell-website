import { esc, map } from "../templates/html.js";
import { pageHero, section, sectionHead, button, chip } from "../templates/components.js";
import { roadmap, roadmapNote } from "../data/roadmap.js";
import { site } from "../data/site.js";

/**
 * /soon/ — what's coming, honestly.
 *
 * Rather than a dead form or a vague "check back later", this names the
 * specific systems in progress and their real status. It links out from
 * /contact/ (in place of the disabled interest form) and from the footer.
 *
 * When a feature actually ships, delete its entry from roadmap.js — or flip
 * its status and give it a real link — rather than leaving this page stale.
 */
export default {
  slug: "/soon/",
  title: "Coming soon",
  description:
    "Registration, digital certificates, feedback and participation reports — what PSGIM E-Cell is moving online next.",
  priority: "0.5",

  render() {
    return [
      pageHero({
        kicker: "What's next",
        title: "Moving online, one piece at a time",
        lede: "The interest form isn't live yet — but here is exactly what is being built to replace paper sign-up sheets, spreadsheets and manual reminders.",
      }),

      section({
        id: "roadmap",
        inner: `${sectionHead({
          id: "roadmap",
          kicker: "In progress",
          heading: "What's coming",
          note: roadmapNote,
        })}
<div class="grid grid--3">
  ${map(roadmap, (item) => `<article class="card-sm">
    <div class="row" style="justify-content:space-between;align-items:flex-start">
      <h3>${esc(item.title)}</h3>
      ${chip(item.status === "building" ? "In progress" : "Planned", item.status === "building" ? "accent" : null)}
    </div>
    <p>${esc(item.summary)}</p>
  </article>`)}
</div>`,
      }),

      section({
        id: "meanwhile",
        tone: "tint",
        inner: `${sectionHead({
          id: "meanwhile",
          kicker: "Until then",
          heading: "How to reach us right now",
          body: "Registration and feedback are still manual for the moment — that's fine, it just means a person on the other end instead of a form.",
        })}
<div class="row">
  ${button({ label: "Contact the team", href: "/contact/", variant: "accent" })}
  ${button({ label: "See what we run", href: "/initiatives/", variant: "secondary" })}
</div>`,
      }),
    ].join("\n");
  },
};
