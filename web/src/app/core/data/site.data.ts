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
    { name: 'Instagram', handle: '@psgim_ecell', url: 'https://www.instagram.com/psgim_ecell/', pending: false, icon: 'instagram' },
    { name: 'LinkedIn', handle: 'E-Cell PSGIM', url: 'https://www.linkedin.com/company/e-cell-psgim/', pending: false, icon: 'linkedin' },
    { name: 'YouTube', handle: 'PSGIM E-Cell', url: 'https://youtube.com/@psgimecell', pending: true, icon: 'youtube' },
  ],
  notice: { show: false, text: '' },
  credit: { name: 'Dhatchina Moorthi TA', role: 'Technical Team, PSGIM E-Cell' },
};

export const nav: NavItem[] = [
  {
    label: 'About',
    href: '/about/',
    children: [
      { label: 'About E-Cell', href: '/about/', description: 'Overview & organizational structure' },
      { label: 'Our Journey', href: '/origin/', description: 'How E-Cell was founded & built' },
      { label: 'Why E-Cell', href: '/vision-mission/', description: 'Our core vision, mission & impact' },
      { label: 'The E-Cell Way', href: '/history/', description: 'Culture, timeline & milestones' },
    ],
  },
  {
    label: 'What We Do',
    href: '/initiatives/',
    children: [
      { label: 'Programs', href: '/initiatives/#bootcamp', description: '48-Hour Bootcamp & build weekends' },
      { label: 'Challenges', href: '/nec/', description: 'National competitions & hackathons' },
      { label: 'Workshops', href: '/initiatives/#ideathon', description: 'Ideathons & hands-on building' },
      { label: 'Testimonials', href: '/testimonials/', description: 'Student & founder stories, reviews & experiences' },
      { label: 'Podcasts', href: '/podcast/', description: 'UNPITCHED podcast & founder conversations' },
      { label: 'All Initiatives', href: '/initiatives/', description: 'Explore all programs & activities' },
    ],
  },
  { label: 'Events', href: '/events/' },
  { label: 'Stories', href: '/blogs/' },
  { label: 'Team', href: '/meet-the-team/' },
  { label: 'NEC 2026', href: '/nec/', highlight: true },
];

export const primaryCta: Cta = { label: 'Join the Cell', href: '/contact/' };
