import { esc, map, when } from "../templates/html.js";
import { pageHero, section, sectionHead, eventItem, button, awaitingPanel } from "../templates/components.js";
import { events, eventsNote } from "../data/events.js";
import { splitEvents } from "../templates/html.js";

export default {
  slug: "/events/",
  title: "Events",
  description:
    "The PSGIM E-Cell calendar — speaker sessions, build weekends, the Ideathon and the NEC drive, with dates, formats and turnout.",
  priority: "0.9",
  changefreq: "weekly",

  render() {
    const { upcoming, past } = splitEvents(events);

    return [
      pageHero({
        kicker: "Calendar",
        title: "Events",
        lede: "Every session the Cell runs is listed here with its date, format and turnout — upcoming and past.",
        note: eventsNote,
      }),

      section({
        id: "upcoming",
        inner: `${sectionHead({
          id: "upcoming",
          kicker: "Upcoming",
          heading: upcoming.length ? `Next ${upcoming.length === 1 ? "session" : `${upcoming.length} sessions`}` : "Nothing scheduled yet",
        })}
${
  upcoming.length
    ? `<ul class="events">${map(upcoming, (e) => eventItem(e, { past: false, detailed: true }))}</ul>`
    : awaitingPanel({
        heading: "Between terms",
        body: "The next term’s dates are being confirmed with the office. Past sessions are below, and the interest form will get you the announcement first.",
      })
}`,
      }),

      section({
        id: "past",
        tone: "tint",
        inner: `${sectionHead({
          id: "past",
          kicker: "Past events",
          heading: "The record",
          body: "What the Cell has actually run. Every entry carries its date, format and turnout — this is the evidence base for the NEC drive.",
        })}
<ul class="events">${map(past, (e) => eventItem(e, { past: true, detailed: true }))}</ul>`,
      }),

      section({
        id: "join",
        tone: "band",
        inner: `<div class="closer">
  <div>
    <p class="kicker">Don’t miss the next one</p>
    <h2 class="closer__title" id="join-heading">Get the date <em>before</em> the poster.</h2>
    <p class="closer__body">Members hear about every session first, and get the speaker’s contact afterwards.</p>
  </div>
  <div class="closer__actions">
    ${button({ label: "Join the Cell", href: "/contact/", variant: "accent", size: "lg" })}
  </div>
</div>`,
      }),
    ].join("\n");
  },
};
