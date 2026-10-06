import { FacultyMember, Patron, TeamRole, NecTeam, VerticalEcosystem } from '../models/models';

/**
 * The team ecosystem's single source of truth.
 *
 * Everything in this file is information the organisation actually has. A
 * work-in-progress revision of this file carried a full cast of invented
 * people — `President Candidate`, `Member 01`, bios, quotes, skill lists,
 * and vertical metrics like `50K+ Digital Reach` / `99.9% Uptime`. It never
 * reached a commit and so never shipped, but it was wired up and rendering
 * locally. It is gone, and the types in `models.ts` no longer have fields to
 * put it back into.
 *
 * The rule for anything added here: if it cannot be attributed to a real
 * person or a real, recorded fact about the cell, it does not belong in
 * this file. An unfilled role is written as `null` and shown as "Open";
 * a missing portrait is shown as initials. Absence is presentable. Invented
 * content is not.
 */

// --- GOVERNANCE ---
// The cell's real, verifiable leadership layer. Deliberately not labelled
// "Executive Leadership": these are the institute's patron and its faculty
// coordinators, which is a different thing from a student executive, and no
// student President or Vice President is on record.

export const patron: Patron = { name: 'Dr. Srividya', role: 'Director, PSG Institute of Management' };

export const faculty: FacultyMember[] = [
  { name: 'Dr. Uma Maheswari', role: 'Dean Outreach', org: 'PSGIM E-Cell', photo: 'uma-maheswari.jpg' },
  { name: 'Dr. Vijay Vardhan', role: 'Faculty Coordinator', org: 'PSGIM E-Cell', photo: 'vijay-vardhan.jpg' },
  { name: 'Dr. Venketalakshmi', role: 'Faculty Coordinator', org: 'PSGIM E-Cell', photo: 'venketalakshmi.jpg' },
];

// --- CORE COMMITTEE ---
// Defined remits, honestly showing which are filled and which are open.

export const roles: TeamRole[] = [
  { role: 'Lead', name: 'Nimisha Sivakumar', remit: 'Overall delivery, faculty liaison' },
  { role: 'Technical', name: 'Dhatchina Moorthi TA', remit: 'Website, tooling, data' },
  { role: 'Content & outreach', name: null, remit: 'Copy, event write-ups, collaborations' },
  { role: 'Design & social', name: null, remit: 'Post templates, calendar, publishing' },
  { role: 'Events', name: null, remit: 'Logistics, speakers, venues' },
  { role: 'Analytics', name: null, remit: 'Weekly metrics to the coordinators' },
];

export const rolesNote = 'Assigned from the core team. Roles are confirmed with the faculty coordinators each cycle.';

// --- THE PEOPLE ---
// The 23 students on the 2026 NEC drive. Names only: no portrait exists for
// any of them, and no bio, skill or vertical assignment is recorded. Shown
// as an index of real people rather than as incomplete profile cards.

export const necTeam: NecTeam = {
  lead: { name: 'Nimisha Sivakumar', role: 'Team Leader' },
  members: [
    { name: 'Sakia NS' },
    { name: 'Suthaarshiny R S' },
    { name: 'Susrutha Dhanaraj' },
    { name: 'Shabharish M' },
    { name: 'Nithin Teja S' },
    { name: 'Jegadharani' },
    { name: 'Charan Balaji' },
    { name: 'Pranav S V' },
    { name: 'Shiva Monish R' },
    { name: 'Prabodhini A' },
    { name: 'Ajjay Marshal' },
    { name: 'Sruthi B' },
    { name: 'Amrutha Sivaani' },
    { name: 'Shanjai K' },
    { name: 'Hefna Frenchia D' },
    { name: 'V Shrinidhi' },
    { name: 'Akshaya Nadar' },
    { name: 'Kamali Shree U S' },
    { name: 'Athmika A' },
    { name: 'Khavya S' },
    { name: 'Dhatchina Moorthi TA' },
  ],
  note: 'Photos are being added — members are listed by name and initials until then.',
};

// 21 members + the lead. The roll stood at 23 when it was first committed;
// Jeyashri has since left the team, which is why this is 22 and not the 23
// that earlier revisions of this file recorded. `nec.data.ts`'s published
// "Team members" stat is kept in step with this number by hand.
export const necTeamSize = necTeam.members.length + 1; // = 22

// --- VERTICALS ---
// Five verticals, documented by remit. No heads, no rosters, no metrics:
// none of those are recorded. `relatedWork` links to a real page on this
// site where the vertical's output can be seen, which is a navigational
// fact rather than a performance claim.

export const verticalEcosystems: VerticalEcosystem[] = [
  {
    id: 'v-media',
    slug: 'media',
    name: 'Media',
    shortName: 'Media',
    description:
      'Crafting the visual identity, digital campaign assets, social communications, and brand narrative of PSGIM E-Cell.',
    heroImage: '/illustrations/verticals/media-creative.jpg',
    displayOrder: 1,
    responsibilities: [
      'Brand guideline definition and visual asset creation',
      'Social media campaigns, video production, and event collateral',
      'Campus news coverage, press releases, and graphic design',
      'Visual storytelling for student founder highlights',
    ],
    relatedWork: { label: 'Gallery', href: '/gallery' },
    isActive: true,
  },
  {
    id: 'v-tech',
    slug: 'technical',
    name: 'Technical',
    shortName: 'Technical',
    description:
      'Engineering web platforms, developer tooling, and digital system infrastructure powering the E-Cell ecosystem.',
    heroImage: '/illustrations/verticals/technical-systems.jpg',
    displayOrder: 2,
    responsibilities: [
      'Developing and maintaining the official PSGIM E-Cell web application',
      'Creating internal workflow tools, portals, and registration systems',
      'Technical mentorship for student software and tech ventures',
      'Data management, system security, and analytics tracking',
    ],
    relatedWork: { label: 'Website & AV', href: '/website-av' },
    isActive: true,
  },
  {
    id: 'v-podcast',
    slug: 'podcasts',
    name: 'Podcasts',
    shortName: 'Podcasts',
    description:
      'Curating insightful audio series, founder interviews, and editorial features celebrating entrepreneurial journeys.',
    heroImage: '/illustrations/verticals/podcasts-audio.jpg',
    displayOrder: 3,
    responsibilities: [
      'Host and produce the official E-Cell podcast series',
      'Research and interview guest entrepreneurs and alumni',
      'Write editorial articles, founder teardowns, and blogs',
      'Audio engineering, editing, and distribution',
    ],
    relatedWork: { label: 'Podcast', href: '/podcast' },
    isActive: true,
  },
  {
    id: 'v-ops',
    slug: 'operations',
    name: 'Operations',
    shortName: 'Operations',
    description:
      'Architecting flagship summits, pitch competitions, event logistics, and on-ground execution for E-Cell activities.',
    heroImage: '/illustrations/verticals/operations-logistics.jpg',
    displayOrder: 4,
    responsibilities: [
      'End-to-end planning and execution of E-Cell flagships & workshops',
      'Venue coordination, hospitality, and speaker management',
      'On-ground audience flow and real-time operations',
      'Post-event feedback synthesis and continuous improvement',
    ],
    relatedWork: { label: 'Events', href: '/events' },
    isActive: true,
  },
  {
    // No illustration of its own. It previously borrowed `reach/
    // ecosystem-network.jpg` to keep the row of cards uniform; it now renders
    // as a typographic panel instead, which is a deliberate composition
    // rather than a gap. Give it artwork only when artwork is actually made
    // for it.
    id: 'v-pr',
    slug: 'public-relations',
    name: 'Public Relations',
    shortName: 'Public Relations',
    description:
      'Driving student participation across all departments, corporate relations, and national competition logistics.',
    heroImage: null,
    displayOrder: 5,
    responsibilities: [
      'Cross-departmental student mobilization and class engagement',
      'Inter-college E-Cell networking and national challenge representation',
      'Corporate sponsorship outreach and alumni mentor network onboarding',
      'Press communication and media release distribution',
    ],
    relatedWork: { label: 'National Entrepreneurship Challenge', href: '/nec' },
    isActive: true,
  },
];

/** Build-time list for prerendering `/meet-the-team/vertical/:slug`. */
export const verticalSlugs = verticalEcosystems.filter((v) => v.isActive).map((v) => v.slug);
