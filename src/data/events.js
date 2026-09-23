/**
 * The calendar.
 *
 * Add an event by adding an object here — nothing else needs to change. The
 * build sorts them and decides what is upcoming and what is past by comparing
 * `date` (and `endDate`, if the event runs over several days) to the build
 * date. The old site hard-coded "Upcoming" / "Past" chips by hand, which meant
 * they silently went stale; they are now derived.
 *
 * date     — ISO YYYY-MM-DD, the day it starts.
 * endDate  — optional ISO date for multi-day events.
 * time     — free text shown as metadata ("6:00 PM", "Fri – Sun").
 * turnout  — attendance, only meaningful once the event has happened.
 * registration — "open" | "closed" | null.
 * pending  — true while the entry is illustrative rather than confirmed.
 */

export const events = [
  {
    id: "founders-on-campus-sep",
    title: "Founders on Campus — bootstrapped SaaS from Coimbatore",
    initiative: "founders-on-campus",
    date: "2026-09-18",
    time: "6:00 PM",
    venue: "Auditorium",
    audience: "Open to all",
    summary:
      "A Coimbatore founder on going from a college side-project to a profitable software business without raising a rupee.",
    turnout: null,
    registration: null,
    pending: true,
  },
  {
    id: "bootcamp-oct",
    title: "48-Hour Bootcamp — problem statements from local industry",
    initiative: "bootcamp",
    date: "2026-10-04",
    endDate: "2026-10-06",
    time: "Fri – Sun",
    venue: null,
    audience: "Teams of 4",
    summary:
      "A full build weekend. Problem statements from local manufacturers and D2C brands. Mentors on site throughout.",
    turnout: null,
    registration: "open",
    pending: true,
  },
  {
    id: "nec-kickoff",
    title: "NEC kick-off & orientation",
    initiative: "nec-drive",
    date: "2026-08-22",
    time: null,
    venue: "Seminar Hall",
    audience: null,
    summary:
      "The campaign team and open attendees walked through the NEC task list, timeline and how to get involved.",
    turnout: "~120 attended",
    registration: null,
    pending: true,
  },
  {
    id: "idea-clinic-jul",
    title: "Idea Clinic — one-on-one feedback with mentors",
    initiative: "idea-clinic",
    date: "2026-07-30",
    time: null,
    venue: null,
    audience: "14 teams",
    summary:
      "Fourteen teams, twenty-minute slots, one written next step each. Three were fast-tracked to the Bootcamp.",
    turnout: "~45 attended",
    registration: null,
    pending: true,
  },
  {
    id: "ideathon-2026-finals",
    title: "Ideathon 2026 finals",
    initiative: "ideathon",
    date: "2026-03-12",
    time: null,
    venue: null,
    audience: "₹25k prize pool",
    summary:
      "Nine teams pitched live to a panel of alumni and investors. The top three took a mentoring block into the summer.",
    turnout: "~200 attended",
    registration: null,
    pending: true,
  },
];

/**
 * Shown under the calendar wherever illustrative entries are on screen, so a
 * visitor is never misled about which dates are confirmed.
 */
export const eventsNote =
  "Sample entries while the calendar is being confirmed with the office. Dates, venues and turnout are illustrative.";
