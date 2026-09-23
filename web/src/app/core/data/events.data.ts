import { EventItem } from '../models/models';

export const events: EventItem[] = [
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

export const eventsNote = 'Sample entries while the calendar is being confirmed with the office. Dates, venues and turnout are illustrative.';

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
