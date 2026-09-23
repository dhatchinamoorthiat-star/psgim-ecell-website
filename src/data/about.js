/** Long-form copy for /about/ and the homepage introduction. */

export const intro = {
  kicker: "What is PSGIM E-Cell?",
  headline: "Ideas, tested early — and taken seriously.",
  body: [
    "PSGIM E-Cell helps students through workshops, speaker sessions, a build-weekend format and an annual idea competition — a small crucible for innovation, run entirely by students.",
    "We provide guidance from experienced mentors, routes to a first customer, and a network of alumni founders and partner E-Cells.",
  ],
};

export const hero = {
  kicker: "PSG Institute of Management · Coimbatore",
  headline: "Creating founders on campus",
  lede: "The Entrepreneurship Cell of PSGIM has, since 2019, helped students take an idea from a classroom conversation to a working venture — through speaker sessions, build weekends, mentorship and the National Entrepreneurship Challenge.",
};

export const story = {
  kicker: "The story",
  paragraphs: [
    "PSGIM E-Cell started in 2019 as a handful of students who wanted the same thing the older IITs and NITs had — a room where you could bring a half-formed idea and leave with a next step.",
    "Seven years on, the Cell runs a repeating calendar of speaker sessions, build weekends and an annual Ideathon, and it represents PSGIM in the National Entrepreneurship Challenge run by E-Cell, IIT Bombay.",
    "This year the team is building its first proper website and a serious social-media presence.",
  ],
};

export const vision = {
  kicker: "Vision & mission",
  heading: "What we’re for",
  note: "Drafted by the team, pending sign-off from the faculty coordinators.",
  pending: true,
  statement:
    "To make entrepreneurship a natural career choice for every PSGIM student, and to build a campus where ideas are tested, mentored and taken to market.",
  mission: [
    "Run speaker sessions, workshops and competitions every term, open to all departments.",
    "Pair every serious idea with a mentor and a route to a first customer.",
    "Turn up for NEC and other national challenges with real activity to show.",
    "Publish what happened — numbers, photos, outcomes — after every event.",
  ],
};

export const timeline = {
  kicker: "Timeline",
  heading: "How we got here",
  note: "Milestones to be confirmed against E-Cell records.",
  pending: true,
  entries: [
    { year: "2019", what: "E-Cell founded by a student group at PSGIM." },
    { year: "2021", what: "First inter-department Ideathon; speaker series becomes monthly." },
    { year: "2023", what: "Bootcamp format introduced; first mentor panel assembled." },
    { year: "2025", what: "Cross-college collaborations begin; social accounts opened." },
    { year: "2026", what: "Registered for NEC; first website and outreach drive." },
  ],
};

export const colophon = {
  kicker: "Colophon",
  heading: "About this site",
  paragraphs: [
    "Designed and built in-house by the PSGIM E-Cell technical team.",
    "Static pages — no backend, no tracking, edge-served for instant loads. All content lives in plain data files any team member can edit without touching the design.",
  ],
};

/**
 * Mentors and speakers who have been in the room.
 *
 * Deliberately empty. The previous site shipped six invented placeholder
 * people ("Speaker one", "Mentor two", "Investor five") with fabricated
 * designations; presenting those as a mentor wall is exactly the kind of thing
 * that costs an institution its credibility. Add real entries here — name,
 * role, org, optional photo in src/public/mentors/ — and the section appears.
 * While the list is empty the page shows an honest "being confirmed" panel.
 */
export const mentors = [];

/**
 * Testimonials. Also deliberately empty, for the same reason — the old site
 * carried four placeholder quotes attributed to unnamed students.
 * Shape: { quote, name, role, year, org?, photo? }
 */
export const testimonials = [];
