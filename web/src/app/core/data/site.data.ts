import { SiteConfig, NavItem, Cta } from '../models/models';

export const site: SiteConfig = {
  name: 'PSGIM E-Cell',
  longName: 'Entrepreneurship Cell, PSG Institute of Management',
  institute: 'PSG Institute of Management',
  city: 'Coimbatore',
  founded: 2019,
  tagline: 'Ideas today. Impact tomorrow.',
  url: 'https://psgim-ecell.pages.dev',
  title: 'PSGIM E-Cell — Entrepreneurship Cell, PSG Institute of Management',
  description:
    'The student-run Entrepreneurship Cell of PSG Institute of Management, Coimbatore. Speaker sessions, build weekends, mentoring and the National Entrepreneurship Challenge.',
  address: {
    lines: ['PSG Institute of Management', 'Avinashi Road, Peelamedu', 'Coimbatore 641004', 'Tamil Nadu, India'],
    oneLine: 'PSG Institute of Management, Avinashi Road, Peelamedu, Coimbatore 641004',
  },
  contact: {
    email: { value: 'ecell@psgim.ac.in', pending: true },
    interestForm: { value: null, pending: true },
  },
  social: [
    { name: 'Instagram', handle: '@ecell.psgim', url: null, pending: true, icon: 'instagram' },
    { name: 'LinkedIn', handle: 'PSGIM E-Cell', url: null, pending: true, icon: 'linkedin' },
  ],
  notice: { show: true, text: 'Pre-launch draft — items marked "to be confirmed" await approval.' },
  credit: { name: 'Dhatchina Moorthi TA', role: 'Technical Team, PSGIM E-Cell' },
};

export const nav: NavItem[] = [
  {
    label: 'About',
    href: '/about/',
    children: [
      { label: 'Origin', href: '/origin/' },
      { label: 'Vision & Mission', href: '/vision-mission/' },
      { label: 'Reach', href: '/reach/' },
      { label: 'Spotlight', href: '/spotlight/' },
      { label: 'History', href: '/history/' },
    ],
  },
  {
    label: 'Initiatives',
    href: '/initiatives/',
    children: [
      { label: 'Podcast', href: '/podcast/' },
      { label: 'Website AV', href: '/website-av/' },
      { label: 'Gallery', href: '/gallery/' },
    ],
  },
  { label: 'Events', href: '/events/' },
  { label: 'Team', href: '/team/' },
  { label: 'Inauguration', href: '/inauguration/' },
  { label: 'NEC 2026', href: '/nec/', highlight: true },
];

export const primaryCta: Cta = { label: 'Join the Cell', href: '/contact/' };
