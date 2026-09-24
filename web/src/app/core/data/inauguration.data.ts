import { InaugurationData } from '../models/models';

export const inauguration: InaugurationData = {
  hero: {
    kicker: 'PSGIM E-Cell',
    title: 'Grand Inauguration',
    lede: 'The checklist for launching E-Cell PSGIM in public — greetings, deliverables and the team behind the day.',
  },
  videos: {
    heading: 'Greeting videos',
    note: 'Names taken from the planning notes — awaiting confirmed titles and final video files.',
    items: [
      { title: 'Greeting', speaker: 'Shridhya', pending: true },
      { title: 'Greeting', speaker: 'Uma', pending: true },
      { title: 'Greeting', speaker: 'Vijay Sir', pending: true },
    ],
  },
  launch: {
    heading: 'Launch checklist',
    note: 'The set of deliverables to go live alongside the inauguration.',
    items: [
      { label: 'LOR (Letter of Recommendation template)', done: false },
      { label: 'DPS', done: false },
      { label: 'Website', done: true },
      { label: 'YouTube', done: false },
      { label: 'Grand launch — podcast & clip', done: false },
    ],
  },
  avVideo: {
    heading: 'AV video of E-Cell',
    note: 'A short audio-visual introduction to E-Cell PSGIM, to premiere at the launch — in production.',
  },
  coreCommittee: {
    heading: 'Core committee',
    note: 'The core team running the Cell — see the full list on the Team page.',
  },
};
