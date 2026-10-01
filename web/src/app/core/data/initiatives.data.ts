import { Initiative, JourneyStage, WhatWeCreateContent } from '../models/models';
import type { EditorialRowItem } from '../../shared/ui/editorial-row-list/editorial-row-list.component';

export const initiatives: Initiative[] = [
  {
    id: 'founders-on-campus',
    index: '01',
    title: 'Founders on Campus',
    tag: 'Speaker series',
    cadence: 'Monthly',
    venue: 'Auditorium',
    stage: 'spark',
    summary: 'A monthly evening with a founder or operator — 40 minutes of story, 20 of questions.',
    body: "Each session brings one founder or early operator to campus for an honest account of what building actually looked like — the false starts, the first customer, the month things nearly ended. We keep it to 40 minutes of talk and 20 of open questions, and every attendee leaves with the speaker's contact and one concrete next step for their own idea.",
  },
  {
    id: 'bootcamp',
    index: '02',
    title: '48-Hour Bootcamp',
    tag: 'Build weekend',
    cadence: 'Once a semester',
    venue: null,
    stage: 'build',
    summary: 'Teams take a real problem to a tested prototype and a two-minute pitch in one weekend.',
    body: 'Friday evening we hand out problem statements sourced from local industry. By Sunday afternoon every team has spoken to at least five potential users, built something they can demo, and delivered a two-minute pitch to a panel. Mentors float between teams the whole weekend. It is the fastest way we know to turn "I have an idea" into "I have a thing."',
  },
  {
    id: 'ideathon',
    index: '03',
    title: 'Ideathon',
    tag: 'Competition',
    cadence: 'February',
    venue: null,
    stage: 'test',
    summary: 'An open annual idea contest with a cash prize and a mentoring block for the top three teams.',
    body: 'Ideathon is the one fully open event — any student, any department, any stage of idea. Entries are a one-page brief and a 90-second video. Shortlisted teams pitch live; the top three win a cash prize and a dedicated mentoring block to take the idea further. Past winners have gone on to the Bootcamp and to NEC.',
  },
  {
    id: 'nec-drive',
    index: '04',
    title: 'NEC Campus Drive',
    tag: 'National',
    cadence: 'Aug – Nov',
    venue: null,
    stage: 'back',
    href: '/nec/',
    summary: 'Our structured push for the National Entrepreneurship Challenge — activities, outreach and reporting.',
    body: "NEC is E-Cell IIT Bombay's pan-India challenge to build a functioning E-Cell on every campus. From August to November the Cell runs the NEC task list, documents every activity, and reports weekly. The dedicated NEC page tracks our progress and is where the campaign team signs up.",
  },
  {
    id: 'ambassadors',
    index: '05',
    title: 'Campus Ambassadors',
    tag: 'Network',
    cadence: 'Year-round',
    venue: null,
    stage: 'spark',
    summary: "Students across departments who carry E-Cell into their classes and bring ideas back.",
    body: "Ambassadors are the Cell's reach into every classroom. They run micro-events, spot students with ideas worth backing, and feed them into Idea Clinic and the Bootcamp. It is a light commitment — a couple of hours a month — and a real line on a CV.",
  },
  {
    id: 'idea-clinic',
    index: '06',
    title: 'Idea Clinic',
    tag: 'Mentoring',
    cadence: 'Fortnightly',
    venue: null,
    stage: 'test',
    summary: 'One-on-one feedback sessions where a team leaves with a mentor and a concrete next step.',
    body: 'Book a 20-minute slot, bring whatever you have, and talk it through with a mentor and two senior Cell members. No pitch deck required. Every clinic ends with a written next step and, where it fits, an introduction — to a mentor, a potential user, or a past founder who has solved the same problem.',
  },
  {
    id: 'unpitched',
    index: '07',
    title: 'UNPITCHED',
    tag: 'Podcast',
    cadence: 'Ongoing',
    venue: null,
    stage: 'spark',
    summary: 'Conversations beyond the pitch — the doubts, failures and questions behind the ideas.',
    body: 'Entrepreneurship is more than success stories. UNPITCHED opens up conversations around the people, experiences, choices and lessons behind ideas — no rehearsed success story, just real conversations.',
  },
];

export const whatWeCreate: WhatWeCreateContent = {
  kicker: 'What we create',
  heading: 'From ideas to experiences',
  items: [
    { label: 'Conversations', body: 'Stories, perspectives and honest conversations through podcasts and student-focused content.' },
    { label: 'Collaborations', body: 'Building connections across PSG, Coimbatore, India and beyond.' },
    { label: 'Communities', body: 'Creating spaces where students, alumni and entrepreneurial communities can continue conversations beyond the classroom.' },
    { label: 'Initiatives', body: 'Turning student ideas into meaningful experiences, experiments and opportunities.' },
    { label: 'Challenges', body: 'Creating opportunities to question, solve, compete and think differently.' },
    { label: 'Learning', body: 'Learning doesn’t always happen inside a classroom. Sometimes it happens while building something together.' },
  ],
};

export const stages: JourneyStage[] = [
  { id: 'spark', index: '01', label: 'Spark', note: 'Hear how it actually happens, and say the idea out loud.' },
  { id: 'test', index: '02', label: 'Test', note: 'Put it in front of a mentor and five real users.' },
  { id: 'build', index: '03', label: 'Build', note: 'A weekend to turn the idea into something you can demo.' },
  { id: 'back', index: '04', label: 'Back', note: 'Take it to a national stage, with the Cell behind it.' },
];

/**
 * Shared `initiatives` → `EditorialRowItem[]` mapping, used by every page that
 * shows the numbered initiatives row list (Home teaser, the Initiatives page's
 * own jump list, About's "What we do"). 'route' links to /initiatives/ (with
 * a fragment, or the initiative's own href if it has one); 'anchor' is for
 * use on the Initiatives page itself, linking to the in-page detail section.
 */
/**
 * Disclosure variant for the Initiatives page itself, where the row expands to
 * the initiative's full body in place rather than linking to a duplicate detail
 * section further down. Only initiatives with their own page get a CTA.
 */
export function toInitiativeDisclosureRows(): EditorialRowItem[] {
  return initiatives.map((item) => ({
    id: item.id,
    index: item.index,
    title: item.title,
    summary: item.summary,
    tag: item.tag,
    when: item.venue ? `${item.cadence} · ${item.venue}` : item.cadence,
    details: {
      body: item.body,
      ...(item.href ? { cta: { label: 'Explore', href: item.href } } : {}),
    },
  }));
}

export function toInitiativeRows(linkMode: 'route' | 'anchor' = 'route'): EditorialRowItem[] {
  return initiatives.map((item) => ({
    id: item.id,
    index: item.index,
    title: item.title,
    summary: item.summary,
    tag: item.tag,
    when: item.venue ? `${item.cadence} · ${item.venue}` : item.cadence,
    ...(linkMode === 'anchor'
      ? { anchor: `/initiatives/#${item.id}` }
      : { href: item.href ?? '/initiatives/', fragment: item.href ? undefined : item.id }),
  }));
}
