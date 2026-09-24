import { SearchEntry } from '../models/models';

export const searchIndex: SearchEntry[] = [
  { label: 'Home', href: '/', section: 'Site', keywords: ['home', 'landing'] },
  { label: 'About', href: '/about/', section: 'About', keywords: ['about', 'overview'] },
  { label: 'Origin', href: '/origin/', section: 'About', keywords: ['origin', 'story', 'founded', 'history'] },
  { label: 'Vision & Mission', href: '/vision-mission/', section: 'About', keywords: ['vision', 'mission', 'goals'] },
  { label: 'Reach', href: '/reach/', section: 'About', keywords: ['reach', 'ecosystem', 'network'] },
  { label: 'Spotlight', href: '/spotlight/', section: 'About', keywords: ['spotlight', 'feature', 'founders'] },
  { label: 'History', href: '/history/', section: 'About', keywords: ['history', 'timeline', 'milestones'] },
  { label: 'Initiatives', href: '/initiatives/', section: 'Initiatives', keywords: ['initiatives', 'programs'] },
  { label: 'Podcast', href: '/podcast/', section: 'Initiatives', keywords: ['podcast', 'episodes', 'audio'] },
  { label: 'Website AV', href: '/website-av/', section: 'Initiatives', keywords: ['website av', 'video', 'av'] },
  { label: 'Gallery', href: '/gallery/', section: 'Initiatives', keywords: ['gallery', 'photos', 'pictures'] },
  { label: 'Events', href: '/events/', section: 'Site', keywords: ['events', 'calendar'] },
  { label: 'Team', href: '/team/', section: 'Site', keywords: ['team', 'faculty', 'members', 'meet our team'] },
  { label: 'Inauguration', href: '/inauguration/', section: 'Site', keywords: ['inauguration', 'grand inauguration', 'launch', 'core committee'] },
  { label: 'NEC 2026', href: '/nec/', section: 'Site', keywords: ['nec', 'national entrepreneurship challenge'] },
  { label: 'Contact', href: '/contact/', section: 'Site', keywords: ['contact', 'reach us', 'get in touch'] },
];
