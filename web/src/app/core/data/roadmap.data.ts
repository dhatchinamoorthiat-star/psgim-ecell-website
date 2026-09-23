import { RoadmapItem } from '../models/models';

export const roadmap: RoadmapItem[] = [
  { id: 'registration', title: 'Online registration', status: 'building', summary: "Register for an event in a couple of taps, from your phone — no more paper sign-up sheets or a Google Form bolted on after the fact." },
  { id: 'certificates', title: 'Digital certificates', status: 'building', summary: 'A certificate with its own serial number and a QR code that verifies it — issued the moment an event closes, not weeks later.' },
  { id: 'feedback', title: 'Feedback, right after the session', status: 'building', summary: "A short feedback form tied to the pass you checked in with, sent right after the event — so we hear from people while it's fresh." },
  { id: 'attendance', title: 'QR check-in & attendance', status: 'building', summary: 'Scan in at the door. Attendance is recorded automatically, per session — no paper register to chase down afterwards.' },
  { id: 'reports', title: 'Participation reports', status: 'building', summary: 'Turnout, attendance and NEC-linked activity, tracked centrally instead of rebuilt by hand for every report.' },
  { id: 'records', title: 'A single record of every event', status: 'building', summary: 'One place for what the Cell has run — date, format, turnout, photos, outcome — instead of scattered spreadsheets and old captions.' },
];

export const roadmapNote = "These run on a system the team has already built — it just isn't switched on for everyone yet. Nothing here is a promise with no work behind it.";
