/**
 * Site-wide facts and configuration.
 *
 * Everything in src/data is plain data. Edit these files to change the site —
 * you should never need to touch a template or a stylesheet to correct a name,
 * a date or a link.
 *
 * CONVENTION: any value the team has not confirmed yet carries `pending: true`
 * (or lives under a `pending` block). The templates render pending content with
 * a visible "to be confirmed" treatment rather than passing it off as fact.
 * Fill the value in, delete the flag, rebuild.
 */

export const site = {
  name: "PSGIM E-Cell",
  longName: "Entrepreneurship Cell, PSG Institute of Management",
  institute: "PSG Institute of Management",
  city: "Coimbatore",
  founded: 2019,
  /* Brand line, from the official E-Cell PSGIM identity. */
  tagline: "Ideas today. Impact tomorrow.",

  // Used for canonical URLs, sitemap and Open Graph. Change this when the
  // site moves to its final domain.
  url: "https://psgim-ecell.pages.dev",

  title: "PSGIM E-Cell — Entrepreneurship Cell, PSG Institute of Management",
  description:
    "The student-run Entrepreneurship Cell of PSG Institute of Management, Coimbatore. Speaker sessions, build weekends, mentoring and the National Entrepreneurship Challenge.",

  address: {
    lines: ["PSG Institute of Management", "Avinashi Road, Peelamedu", "Coimbatore 641004", "Tamil Nadu, India"],
    // Plain text, used for the footer one-liner.
    oneLine: "PSG Institute of Management, Avinashi Road, Peelamedu, Coimbatore 641004",
  },

  contact: {
    // The office has not confirmed the mailbox yet — flagged rather than invented.
    email: { value: "ecell@psgim.ac.in", pending: true },
    // Interest form URL. Until the team creates it, the CTA degrades to the
    // contact page instead of pointing at a dead link.
    interestForm: { value: null, pending: true },
  },

  /**
   * Social accounts. `url: null` means the handle exists but the link has not
   * been confirmed — the template renders it as plain text instead of a dead
   * `href="#"`, which is what the old site shipped.
   */
  social: [
    { name: "Instagram", handle: "@ecell.psgim", url: null, pending: true, icon: "instagram" },
    { name: "LinkedIn", handle: "PSGIM E-Cell", url: null, pending: true, icon: "linkedin" },
  ],

  /**
   * The banner the previous site carried at the top of every page. The redesign
   * removes the "modelled on E-Cell IIT Bombay" wording — this site now has its
   * own identity — but the approval status is a real fact, so it stays,
   * stated plainly and once.
   *
   * Set `show: false` after the Director and faculty coordinators sign off.
   */
  notice: {
    show: true,
    text: "Pre-launch draft — items marked “to be confirmed” await approval.",
  },

  credit: {
    name: "Dhatchina Moorthi TA",
    role: "Technical Team, PSGIM E-Cell",
  },
};

/** Primary navigation. Order here is the order on screen. */
export const nav = [
  { label: "About", href: "/about/" },
  { label: "Initiatives", href: "/initiatives/" },
  { label: "Events", href: "/events/" },
  { label: "Team", href: "/team/" },
  { label: "Gallery", href: "/gallery/" },
  { label: "NEC 2026", href: "/nec/", highlight: true },
];

/** The single call to action repeated across the site. */
export const primaryCta = { label: "Join the Cell", href: "/contact/" };
