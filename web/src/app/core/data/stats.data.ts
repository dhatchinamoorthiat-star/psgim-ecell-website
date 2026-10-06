import { Stat, DriveContent } from '../models/models';

export const stats: Stat[] = [
  { value: '2019', label: 'Established', count: null },
  { value: '75+', label: 'Active members', count: 75, suffix: '+' },
  { value: '20+', label: 'Events a year', count: 20, suffix: '+' },
  { value: 'NEC', label: '2026 · Registered', count: null },
];

export const drive: DriveContent = {
  note: 'Self-reported working figures · baseline recorded September 2026 · targets end of October',
  pending: true,
  targets: [
    { label: 'Instagram', now: 108, target: 3000, detail: 'Reels, founder stories and event recaps; collaborations with other college E-Cells.' },
    { label: 'LinkedIn', now: 414, target: 3000, detail: 'The priority channel for NEC — every activity documented and tagged.' },
    { label: 'Documented events', now: 6, target: 12, detail: 'Each with date, footfall, photos and outcome, published on this site.' },
  ],
};
