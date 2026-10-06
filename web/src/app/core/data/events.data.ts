import { EventItem } from '../models/models';

export const sampleEvents: EventItem[] = [
  {
    id: 'founders-on-campus-sep',
    title: 'Founders on Campus — bootstrapped SaaS from Coimbatore',
    initiative: 'founders-on-campus',
    date: '2026-09-18',
    time: '6:00 PM',
    venue: 'Auditorium',
    audience: 'Open to all',
    summary: 'A Coimbatore founder on going from a college side-project to a profitable software business without raising a rupee.',
    turnout: null,
    registration: null,
    pending: true,
  },
  {
    id: 'bootcamp-oct',
    title: '48-Hour Bootcamp — problem statements from local industry',
    initiative: 'bootcamp',
    date: '2026-10-04',
    endDate: '2026-10-06',
    time: 'Fri – Sun',
    venue: null,
    audience: 'Teams of 4',
    summary: 'A full build weekend. Problem statements from local manufacturers and D2C brands. Mentors on site throughout.',
    turnout: null,
    registration: 'open',
    pending: true,
  },
  {
    id: 'nec-kickoff',
    title: 'NEC kick-off & orientation',
    initiative: 'nec-drive',
    date: '2026-08-22',
    time: null,
    venue: 'Seminar Hall',
    audience: null,
    summary: 'The campaign team and open attendees walked through the NEC task list, timeline and how to get involved.',
    turnout: '~120 attended',
    registration: null,
    pending: true,
  },
  {
    id: 'idea-clinic-jul',
    title: 'Idea Clinic — one-on-one feedback with mentors',
    initiative: 'idea-clinic',
    date: '2026-07-30',
    time: null,
    venue: null,
    audience: '14 teams',
    summary: 'Fourteen teams, twenty-minute slots, one written next step each. Three were fast-tracked to the Bootcamp.',
    turnout: '~45 attended',
    registration: null,
    pending: true,
  },
  {
    id: 'ideathon-2026-finals',
    title: 'Ideathon 2026 finals',
    initiative: 'ideathon',
    date: '2026-03-12',
    time: null,
    venue: null,
    audience: '₹25k prize pool',
    summary: 'Nine teams pitched live to a panel of alumni and investors. The top three took a mentoring block into the summer.',
    turnout: '~200 attended',
    registration: null,
    pending: true,
  },
];

export const linkedInEvents: EventItem[] = [
  {
    id: 'un-day-2025',
    title: 'UN Day 2025 — Rebooting Sustainability: Youth Startups in the E-Waste Economy',
    date: '2025-10-23',
    time: '2:00 PM – 4:30 PM',
    venue: 'CAL Lab, PSG Institute of Management',
    audience: 'Open to all',
    summary:
      'A workshop marking United Nations Day 2025, exploring how sustainability and innovation can power the e-waste economy and shape responsible entrepreneurship.',
    description:
      'Organized in association with Green Era Recyclers, the session brought together management students, young entrepreneurs and sustainability advocates to explore solutions for responsible production and consumption, aligned with the UN Sustainable Development Goals. Highlights included a keynote on the e-waste economy, a "Pitch the Future" ideation sprint, and a UN Day oath for responsible innovation.',
    turnout: null,
    registration: null,
    pending: false,
    speaker: { name: 'Prasanth Omanakuttan', designation: 'Founder', org: 'Green Era Recyclers' },
    gallery: [
      { src: '/events/un-day-2025/01.jpg', alt: 'UN Day 2025 event poster' },
      { src: '/events/un-day-2025/02-recap.jpg', alt: 'Students and faculty at the UN Day 2025 workshop' },
    ],
    linkedinUrl: 'https://www.linkedin.com/posts/e-cell-psgim_psgim-unsdg-unday-activity-7388789673655066624-j4lj',
    hashtags: ['PSGIM', 'ECell', 'UNDay2025', 'CircularEconomy', 'Sustainability', 'Entrepreneurship', 'EwasteEconomy'],
  },
  {
    id: 'yes-26-business-pitch',
    title: "YES '26 — Business Pitch Competition",
    date: '2026-02-27',
    time: null,
    venue: 'PSG Institute of Management',
    audience: 'Open to all · Registration fee ₹300 (includes lunch)',
    summary:
      'A business pitch competition at YES \'26, where student founders presented startup concepts for expert feedback and prize money.',
    description:
      'Part of YES \'26, a programme of workshops and expert talks designed to build entrepreneurial thinking. The Business Pitch Competition gave participants the chance to present their startup concept, receive expert feedback, and compete for prizes.',
    turnout: null,
    registration: 'closed',
    pending: false,
    gallery: [{ src: '/events/yes-26/01.jpg', alt: "YES '26 Business Pitch Competition poster" }],
    linkedinUrl: 'https://www.linkedin.com/posts/e-cell-psgim_yes26-entrepreneurship-psgim-activity-7431925851857788928-wRld',
    hashtags: ['YES26', 'Entrepreneurship', 'PSGIM', 'BusinessPitch', 'Innovation'],
  },
  {
    id: 'sustainability-certifications-tuv-sud',
    title: 'Sustainability Certifications and Career Opportunities',
    date: '2026-03-04',
    time: null,
    venue: null,
    audience: null,
    summary:
      'A session on sustainability-driven careers and the industry certifications that support them, led by a certification-industry expert.',
    description:
      'The session introduced students to key concepts in sustainability, the certifications organizations require, and the growing importance of environmental compliance, alongside career opportunities and skill development in sustainability and management systems.',
    turnout: null,
    registration: null,
    pending: false,
    speaker: { name: 'S. Loganathan', designation: 'General Manager – Management Systems', org: 'TÜV SÜD South Asia Pvt. Ltd.' },
    gallery: [{ src: '/events/sustainability-tuv-sud/01.jpg', alt: 'Sustainability certifications session with TÜV SÜD' }],
    linkedinUrl: 'https://www.linkedin.com/posts/e-cell-psgim_sustainability-ecell-skilldevelopment-activity-7437122123149660160-7f52',
    hashtags: ['Sustainability', 'ECell', 'SkillDevelopment', 'Entrepreneurship', 'FutureCareers'],
  },
  {
    id: 'ipr-awareness-cii',
    title: 'IPR Awareness Program with CII',
    date: '2026-04-09',
    time: null,
    venue: null,
    audience: 'Students and faculty',
    summary:
      'An awareness program on Intellectual Property Rights, covering patents, trademarks, copyrights and the filing process, delivered with the Confederation of Indian Industry.',
    description:
      'The session gave a comprehensive understanding of patents, trademarks and copyrights, along with practical insights into the IPR filing process — from prior art search to application and examination — bridging the gap between creativity and legal protection.',
    turnout: null,
    registration: null,
    pending: false,
    speaker: { name: 'Mahalakshmi Suresh', designation: 'Executive Officer – IPR', org: 'Confederation of Indian Industry (CII)' },
    gallery: [{ src: '/events/ipr-awareness-cii/01.jpg', alt: 'IPR Awareness Program session with CII' }],
    linkedinUrl: 'https://www.linkedin.com/posts/e-cell-psgim_ecellpsgim-ipr-innovation-activity-7448072024205205504-pVhZ',
    hashtags: ['ECellPSGIM', 'IPR', 'Innovation', 'Entrepreneurship', 'Startups', 'CII', 'PSGIM'],
  },
  {
    id: 'in-between-the-chapters',
    title: 'In Between the Chapters — Storytelling Session',
    date: '2026-03-12',
    time: null,
    venue: null,
    audience: null,
    summary:
      'A storytelling workshop guiding participants to weave connections between ideas and craft narratives that bridge existing storylines.',
    description:
      'Facilitated by Alan Hadle Hamilton, the session encouraged students to think beyond conventional perspectives. Participants actively contributed to discussions, brainstormed creatively and developed unique story concepts, strengthening both storytelling ability and teamwork.',
    turnout: null,
    registration: null,
    pending: false,
    speaker: { name: 'Alan Hadle Hamilton' },
    gallery: [
      { src: '/events/in-between-the-chapters/01.jpg', alt: 'In Between the Chapters storytelling session, photo 1' },
      { src: '/events/in-between-the-chapters/02.jpg', alt: 'In Between the Chapters storytelling session, photo 2' },
      { src: '/events/in-between-the-chapters/03.jpg', alt: 'In Between the Chapters storytelling session, photo 3' },
      { src: '/events/in-between-the-chapters/04.jpg', alt: 'In Between the Chapters storytelling session, photo 4' },
    ],
    linkedinUrl: 'https://www.linkedin.com/posts/e-cell-psgim_inbetweenthechapters-storytellingsession-activity-7442056034590035968-P1f4',
    hashtags: ['InBetweenTheChapters', 'StorytellingSession', 'EcellPSGIM', 'PSGIM'],
  },
  {
    id: 'wildcard-ventures',
    title: 'Wildcard Ventures',
    date: '2026-09-10',
    time: null,
    venue: null,
    audience: 'Open to all',
    summary:
      'A rapid-ideation challenge: build a startup concept from three random words and pitch it in sixty seconds.',
    description:
      'Participants received three random words, built a startup idea incorporating all three, and submitted a 60-second video pitch on Instagram. Registration closed 7 September 2026, video submissions were due 9 September, and pitching concluded 10 September. Winners and all participants received certificates.',
    turnout: null,
    registration: 'closed',
    pending: false,
    gallery: [{ src: '/events/wildcard-ventures/01.jpg', alt: 'Wildcard Ventures challenge poster' }],
    linkedinUrl: 'https://www.linkedin.com/posts/e-cell-psgim_wildcardventures-ecellpsgim-nec2026-activity-7502228774638321664-XFmz',
    hashtags: ['WildcardVentures', 'ECellPSGIM', 'NEC2026', 'Entrepreneurship', 'StartupChallenge', 'Innovation'],
  },
];

export const events: EventItem[] = [...linkedInEvents, ...sampleEvents];

export const eventsNote = 'Confirmed past events, sourced from our LinkedIn posts, alongside illustrative placeholders while the rest of the calendar is finalized with the office.';

export function splitEvents(list: EventItem[], now: Date = new Date()): { upcoming: EventItem[]; past: EventItem[] } {
  const upcoming: EventItem[] = [];
  const past: EventItem[] = [];
  for (const ev of list) {
    const end = new Date(ev.endDate ?? ev.date);
    // end-of-day for the comparison date
    end.setHours(23, 59, 59, 999);
    if (end.getTime() >= now.getTime()) {
      upcoming.push(ev);
    } else {
      past.push(ev);
    }
  }
  upcoming.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  past.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return { upcoming, past };
}
