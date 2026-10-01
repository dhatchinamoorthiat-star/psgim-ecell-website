import { NecData } from '../models/models';
import type { EditorialRowItem } from '../../shared/ui/editorial-row-list/editorial-row-list.component';

export const nec: NecData = {
  year: 2026,
  portal: 'https://www.ecell.in/nec',
  organiser: 'E-Cell, IIT Bombay',
  hero: {
    eyebrow: 'PSGIM E-Cell at',
    title: 'National Entrepreneurship Challenge',
    lede: 'PSGIM E-Cell is competing in NEC 2026 — E-Cell IIT Bombay’s pan-India challenge to build an actively functioning Entrepreneurship Cell on every campus.',
  },
  about: {
    heading: 'What is NEC?',
    lead: 'India’s largest student entrepreneurship challenge',
    paragraphs: [
      'An Entrepreneurship Cell matters to a college because it builds students’ entrepreneurial spirit — and NEC is the platform that helps a college turn that into an actively functioning E-Cell.',
      'NEC is a roughly six-month competition run by E-Cell, IIT Bombay. Teams are given a series of tasks that are essential for any Entrepreneurship Cell to run smoothly, and are mentored through them.',
      'PSGIM E-Cell is registered for the 2026 cycle — started on the Basic Track and has since moved up to the Advanced Track. This page is where our campus team tracks the drive and where new members sign up.',
    ],
  },
  goal: {
    heading: 'Our goal',
    lead: 'Entrepreneurship for every student, every idea',
    paragraphs: [
      'We want NEC to leave PSGIM with a stronger, better-documented E-Cell — a repeatable calendar, a mentor bench, and a public record of what the Cell does.',
      'Just as importantly, we want more students on campus to feel that starting something is not rocket science — that there is a room to bring an idea to, and people who will help take it forward.',
    ],
  },
  stats: [
    { value: '23', label: 'Team members', count: 23 },
    { value: '6 mo', label: 'Challenge length', count: 6, suffix: ' mo' },
    { value: '6', label: 'Preliminary tasks cleared', count: 6 },
    { value: '2019', label: 'E-Cell since', count: null },
  ],
  tracks: [
    { name: 'Basic Track', ours: false, body: 'For teams whose E-Cell is new to NEC. PSGIM started the 2026 cycle here before moving up.' },
    { name: 'Advanced Track', ours: true, body: 'For returning teams with an E-Cell older than two years. Deeper tasks, complex challenges, higher stakes — where PSGIM competes now.' },
    { name: 'Mentor Track', ours: false, body: 'Guide other campuses while sharpening leadership and teaching skills. Open to senior E-Cell members.' },
  ],
  incentives: [
    { title: 'Cash prizes', body: 'Winning teams across the challenge share a prize pool worth several lakhs, awarded by E-Cell, IIT Bombay.' },
    { title: 'Official documentation', body: 'Get the PSGIM E-Cell formally documented and recognised by E-Cell, IIT Bombay.' },
    { title: 'E-Summit passes', body: 'Free passes to E-Summit’26, Asia’s largest student entrepreneurship summit.' },
    { title: 'Networking', body: 'Build a network of student founders, mentors and investors across campuses.' },
    { title: 'Mentorship', body: 'A mentor from E-Cell, IIT Bombay assigned to the team through the challenge.' },
    { title: 'Resume value', body: 'Taking part in a pan-India challenge is a real line on every team member’s CV.' },
    { title: 'Certification', body: 'Certificates from Asia’s largest student-run Entrepreneurship Cell.' },
  ],
  progress: {
    heading: 'Our progress',
    lead: 'Preliminary tasks, cleared',
    tasks: [
      { title: 'Brand Your E-Cell', points: 89, maxPoints: 100 },
      { title: 'Draft A Work Report', points: 130, maxPoints: 120 },
      { title: 'Idea Box', points: 145, maxPoints: 140 },
      { title: 'Headstart Task', points: 160, maxPoints: 150 },
      { title: 'Know Your Surroundings', points: 130, maxPoints: 120 },
      { title: 'Gather Insights', points: 110, maxPoints: 100 },
    ],
  },
  timeline: {
    note: 'Confirmed against the official NEC portal as of the Preliminary phase; later dates are still tentative.',
    pending: false,
    entries: [
      { when: 'Jun', what: 'Head-start task & preliminary task launch.' },
      { when: 'Jul 31', what: 'Registration deadline — register before this for the early-bird bonus.' },
      { when: 'Aug 4', what: 'Preliminary task deadline (extended), EOD 11:59 PM.' },
      { when: 'Aug 15', what: 'Last date to add or remove teammates; mentors assigned after the preliminary phase.' },
      { when: 'Aug – Oct', what: 'Weekly tasks continue with mentor support.' },
      { when: 'Oct 18', what: 'Submission window closes for all tasks.' },
      { when: 'Nov', what: 'Advanced track and national finals at IIT Bombay.' },
      { when: 'Dec', what: 'Results announced at E-Summit’26.' },
    ],
  },
  guidelines: [
    'NEC is a 5–6 month challenge focused on building and strengthening your own Entrepreneurship Cell.',
    'PSGIM enters one team for the institute — only one team per college is allowed.',
    'Our team runs on the Advanced Track this cycle; the track is auto-assigned from the E-Cell’s age on the NEC portal.',
    'Each team has a minimum of 5 and a maximum of 25 members — individuals cannot take part alone.',
    'Registering before the deadline earns an early-bird bonus; the task window still closes on the fixed date.',
  ],
  faq: [
    { q: 'How do I join the PSGIM NEC team?', a: 'Fill the interest form linked below. The team lead adds you to the roster on the NEC portal once the campus team is confirmed.' },
    { q: 'Do I need a startup idea to join?', a: 'No. Most NEC tasks are about running the Cell — events, outreach, documentation. Ideas help, but they are not a requirement.' },
    { q: 'What is the time commitment?', a: 'Expect a few hours a week across the six months, heavier around task deadlines and events.' },
    { q: 'Basic or Advanced track — which are we on?', a: 'Advanced. PSGIM started this cycle on Basic and has since moved up — the portal auto-assigns the track from the E-Cell’s age.' },
    { q: 'Can first-years join?', a: 'Yes — the team is open to both years and every department.' },
  ],
  join: {
    heading: 'Join our NEC team',
    lead: 'Bring an idea, or come find one',
    body: 'Open to every department and both years. Fill the interest form and the team lead will be in touch before the next task.',
  },
};

/**
 * Tracks as numbered rows. The track PSGIM actually competes on is marked from
 * the data's own `ours` flag rather than being named again in prose.
 */
export function toTrackRows(): EditorialRowItem[] {
  return nec.tracks.map((track, i) => ({
    id: `track-${i}`,
    index: String(i + 1).padStart(2, '0'),
    title: track.name,
    tag: track.ours ? 'Our track' : undefined,
    details: { body: track.body },
  }));
}

export function toIncentiveRows(): EditorialRowItem[] {
  return nec.incentives.map((incentive, i) => ({
    id: `incentive-${i}`,
    index: String(i + 1).padStart(2, '0'),
    title: incentive.title,
    details: { body: incentive.body },
  }));
}

export function toFaqRows(): EditorialRowItem[] {
  return nec.faq.map((entry, i) => ({
    id: `faq-${i}`,
    index: String(i + 1).padStart(2, '0'),
    title: entry.q,
    details: { body: entry.a },
  }));
}

/**
 * Totals across the cleared preliminary tasks. Several tasks scored above their
 * maximum (bonus points on the NEC portal), so the total can exceed the total
 * maximum — it is not clamped, because the real figure is the point.
 */
export function preliminaryTotals(): { points: number; maxPoints: number } {
  return nec.progress.tasks.reduce(
    (total, task) => ({ points: total.points + task.points, maxPoints: total.maxPoints + task.maxPoints }),
    { points: 0, maxPoints: 0 },
  );
}
