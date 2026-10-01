import {
  IntroContent,
  HeroContent,
  StoryContent,
  VisionContent,
  TimelineContent,
  ReachContent,
  SpotlightContent,
  EcosystemContent,
  IdentityContent,
  DreamEcellContent,
  AlumniContent,
  ClosingContent,
  JoinContent,
  ColophonContent,
  Mentor,
  Testimonial,
  PodcastContent,
  WebsiteAvContent,
} from '../models/models';
import type { EditorialRowItem } from '../../shared/ui/editorial-row-list/editorial-row-list.component';

export const intro: IntroContent = {
  kicker: 'What is PSGIM E-Cell?',
  headline: 'Ideas, tested early — and taken seriously.',
  body: [
    'PSGIM E-Cell helps students through workshops, speaker sessions, a build-weekend format and an annual idea competition — a small crucible for innovation, run entirely by students.',
    'We provide guidance from experienced mentors, routes to a first customer, and a network of alumni founders and partner E-Cells.',
  ],
};

export const hero: HeroContent = {
  kicker: 'PSG Institute of Management · Coimbatore',
  headline: 'Creating founders on campus',
  lede: 'The Entrepreneurship Cell of PSGIM has, since 2019, helped students take an idea from a classroom conversation to a working venture — through speaker sessions, build weekends, mentorship and the National Entrepreneurship Challenge.',
};

export const story: StoryContent = {
  kicker: 'The story',
  paragraphs: [
    `In 2019, a bunch of students at PSGIM started E-Cell. No one assigned them to it, and no one handed them a plan. They were MBA students like everyone else, with the same lectures, assignments and placement season. But they kept noticing the same thing. Classmates kept talking about ideas: a product they wished existed, a gap in a local market, a business they'd start "someday." Then the idea went nowhere, because there was no place on campus to take it. Placements had a process. Academics had a process. A half-formed idea had nothing.`,
    `So they built the place themselves. They gave it one line, We Turn Students into Founders, and set out to make it true.`,
    `The early days were scrappy. There was no big budget and no playbook, just a few classmates who cared enough to organise something and see who turned up. Every session taught them what to do better the next time. It caught on because it was useful. Students came with rough ideas and left with better questions. Classmates challenged each other, mentors sharpened the thinking, and a few ideas started turning into real attempts.`,
    `Seven years on, the setup hasn't changed. E-Cell is still built by students, for students, and the line is still the same. The ideas have gotten sharper, and the community around them has grown.`,
  ],
};

export const vision: VisionContent = {
  kicker: 'Vision & mission',
  heading: 'What we’re for',
  note: 'Drafted by the team, pending sign-off from the faculty coordinators.',
  pending: true,
  statement:
    'To make entrepreneurship a natural career choice for every PSGIM student, and to build a campus where ideas are tested, mentored and taken to market.',
  mission: [
    'Run speaker sessions, workshops and competitions every term, open to all departments.',
    'Pair every serious idea with a mentor and a route to a first customer.',
    'Turn up for NEC and other national challenges with real activity to show.',
    'Publish what happened — numbers, photos, outcomes — after every event.',
  ],
};

/** `vision.mission` as numbered rows for the editorial row list, shared by the About page's inline section and the dedicated /vision-mission/ page. */
export function toMissionRows(): EditorialRowItem[] {
  return vision.mission.map((m, i) => ({
    id: `mission-${i}`,
    index: String(i + 1).padStart(2, '0'),
    title: m,
  }));
}

export const timeline: TimelineContent = {
  kicker: 'Timeline',
  heading: 'How we got here',
  note: 'Milestones to be confirmed against E-Cell records.',
  pending: true,
  entries: [
    { year: '2019', what: 'E-Cell founded by a student group at PSGIM.' },
    { year: '2021', what: 'First inter-department Ideathon; speaker series becomes monthly.' },
    { year: '2023', what: 'Bootcamp format introduced; first mentor panel assembled.' },
    { year: '2025', what: 'Cross-college collaborations begin; social accounts opened.' },
    { year: '2026', what: 'Registered for NEC; first website and outreach drive.' },
  ],
};

export const reach: ReachContent = {
  kicker: 'Reach',
  heading: 'Think beyond the campus',
  lede: 'Great ideas rarely stay in one room. We’re building connections across every layer of the entrepreneurial ecosystem — PSG students and initiatives, colleges across Coimbatore, Indian business and MBA communities, and universities and associations beyond.',
  layers: ['PSG', 'Coimbatore', 'India', 'The world'],
};

export const spotlight: SpotlightContent = {
  kicker: 'Spotlight',
  heading: 'Who we’re highlighting',
  note: 'Founders, alumni and student ventures we want to feature here — nothing confirmed yet, so nothing is invented.',
};

export const ecosystem: EcosystemContent = {
  kicker: 'The ecosystem',
  heading: 'Seven verticals. One bigger picture.',
  paragraphs: [
    'Every vertical has a role. But no vertical exists in isolation. From creating experiences and building communities to managing collaborations and telling stories, our seven verticals work together to move the Cell forward.',
    'Different roles. Different strengths. One ecosystem. And sometimes, the best place to learn isn’t the vertical you’re assigned to.',
    'Your role is a starting point, not a boundary. Members are encouraged to explore beyond their assigned vertical — step into how an event comes together, collaborate on content, connect on partnerships, or learn something completely outside your role. Entrepreneurship is cross-functional by nature. So is learning.',
  ],
};

export const identity: IdentityContent = {
  kicker: 'Our identity',
  heading: 'Not built by one. Built by everyone.',
  paragraphs: [
    'E-Cell PSGIM is being reimagined with a fresh identity, a new direction and an open invitation to contribute — because an ecosystem cannot be built from a single perspective.',
    'Every member brings something different — an idea, a skill, a question, a connection or simply the willingness to try. That is what makes our E-Cell ours.',
  ],
};

export const dreamEcell: DreamEcellContent = {
  kicker: 'Dream E-Cell',
  heading: 'What does your E-Cell look like?',
  paragraphs: [
    'We asked our members to imagine it — not the E-Cell someone else designed, their E-Cell. Dream E-Cell is a collective initiative where every member gets the opportunity to share what they believe the E-Cell could become.',
    'Ideas are documented. Perspectives are discussed. Possibilities are explored. Practical ideas are put into motion. Because the future of E-Cell shouldn’t be decided by one voice — it should be built by many.',
  ],
};

export const alumni: AlumniContent = {
  kicker: 'Alumni community',
  heading: 'The classroom ends. The connection doesn’t.',
  paragraphs: [
    'Our alumni have walked through the classrooms we sit in today. They have made decisions, faced uncertainty, built careers, changed directions and learned things that cannot always be found in a textbook.',
    'The E-Cell Alumni Community aims to bring those experiences back into the conversation through interaction, insights, guidance and collaboration — past experiences, present conversations, future possibilities.',
  ],
};

export const closing: ClosingContent = {
  kicker: 'Building for tomorrow',
  heading: 'An E-Cell that can sustain its own ideas',
  paragraphs: [
    'We don’t just want to create initiatives. We want to create an ecosystem capable of supporting them. Through conclaves, collaborations and other initiatives, E-Cell PSGIM aims to explore sustainable ways of generating and reinvesting resources into the continued development of the club. Create value. Build sustainably. Keep moving.',
    'Ideas need consistency to become action. Every week brings a new question, every month a new milestone. Our seven verticals work towards clear goals, timelines and deliverables while regularly reviewing progress, challenges and opportunities — because an idea without execution remains an idea.',
    'We may not know exactly what E-Cell PSGIM will look like a year from now, and that’s okay — because we are not trying to build something fixed. We are building something that can learn, adapt and grow: a space where students can experiment, where different perspectives can meet, where collaboration is encouraged, where failure becomes a lesson, and where an idea can start small and still matter. This is our E-Cell. And we’re only getting started.',
  ],
};

export const join: JoinContent = {
  kicker: 'Join the ecosystem',
  heading: 'Have an idea? Don’t leave it in your notes app.',
  lede: 'Bring it to the conversation. Whether you want to create, collaborate, learn, experiment or simply explore what’s possible — there’s a place for you here.',
};

export const colophon: ColophonContent = {
  kicker: 'Colophon',
  heading: 'About this site',
  paragraphs: [
    'Designed and built in-house by the PSGIM E-Cell technical team.',
    'Static pages — no backend, no tracking, edge-served for instant loads. All content lives in plain data files any team member can edit without touching the design.',
  ],
};

export const podcast: PodcastContent = {
  kicker: 'Our initiatives',
  heading: 'The E-Cell Podcast',
  note: 'Conversations with founders, mentors and alumni — episodes to be recorded and published once the format and guest line-up are locked in. Nothing is invented here yet.',
};

export const websiteAv: WebsiteAvContent = {
  kicker: 'Our initiatives',
  heading: 'Website AV',
  note: 'A short audio-visual piece introducing the Cell on this site — script and footage still in progress, so nothing is embedded here yet.',
};

/**
 * The four "what we believe" sections as one numbered disclosure list. Each was
 * previously its own full-width section of heading-plus-paragraphs, which gave
 * four near-identical blocks equal weight and buried the page's narrative. The
 * copy is unchanged — only the hierarchy is.
 */
export function toBeliefRows(): EditorialRowItem[] {
  return [identity, ecosystem, dreamEcell, alumni].map((section, i) => ({
    id: `belief-${i}`,
    index: String(i + 1).padStart(2, '0'),
    title: section.heading,
    tag: section.kicker,
    details: { body: section.paragraphs },
  }));
}

export const mentors: Mentor[] = []; // deliberately empty — do not invent people
export const testimonials: Testimonial[] = []; // deliberately empty — do not invent quotes
