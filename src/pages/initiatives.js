import { esc, map } from "../templates/html.js";
import { pageHero, section, initiativeDetail, button } from "../templates/components.js";
import { initiatives, stages } from "../data/initiatives.js";

export default {
  slug: "/initiatives/",
  title: "Initiatives",
  description:
    "Six programmes the PSGIM Entrepreneurship Cell runs every academic year: Founders on Campus, the 48-Hour Bootcamp, Ideathon, the NEC Campus Drive, Campus Ambassadors and Idea Clinic.",
  priority: "0.8",

  render() {
    return [
      pageHero({
        kicker: "What we run",
        title: "Initiatives",
        lede: "Six programmes, repeating every academic year, so a student can follow the whole arc from first idea to national challenge before they graduate.",
      }),

      // A quick index so a visitor can jump straight to the one they were sent
      // here for, rather than scrolling six full sections to find it.
      section({
        className: "block--tight",
        reveal: false,
        inner: `<h2 class="sr-only">Jump to an initiative</h2>
<nav class="filters" aria-label="Initiatives">
  ${map(initiatives, (i) => `<a class="filter" href="#${esc(i.id)}">${esc(i.index)} · ${esc(i.title)}</a>`)}
</nav>`,
      }),

      section({
        className: "block--flush-top",
        inner: `<h2 class="sr-only">All initiatives</h2>
<div>${map(initiatives, initiativeDetail)}</div>`,
      }),

      section({
        id: "join",
        tone: "band",
        inner: `<div class="closer">
  <div>
    <p class="kicker">Get involved</p>
    <h2 class="closer__title" id="join-heading">Pick one and <em>turn up</em>.</h2>
    <p class="closer__body">Every programme here is open to both years and every department. You do not need to apply, and you do not need an idea.</p>
  </div>
  <div class="closer__actions">
    ${button({ label: "Join the Cell", href: "/contact/", variant: "accent", size: "lg" })}
    ${button({ label: "See the calendar", href: "/events/", variant: "secondary", size: "lg" })}
  </div>
</div>`,
      }),
    ].join("\n");
  },
};
