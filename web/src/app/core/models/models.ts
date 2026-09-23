export interface Pending<T> {
  value: T;
  pending: boolean;
}

export interface SocialLink {
  name: string;
  handle: string;
  url: string | null;
  pending: boolean;
  icon: string;
}

export interface SiteConfig {
  name: string;
  longName: string;
  institute: string;
  city: string;
  founded: number;
  tagline: string;
  url: string;
  title: string;
  description: string;
  address: { lines: string[]; oneLine: string };
  contact: { email: Pending<string>; interestForm: Pending<string | null> };
  social: SocialLink[];
  notice: { show: boolean; text: string };
  credit: { name: string; role: string };
}

export interface NavItem {
  label: string;
  href: string;
  highlight?: boolean;
}

export interface Cta {
  label: string;
  href: string;
}

export interface IntroContent {
  kicker: string;
  headline: string;
  body: string[];
}

export interface HeroContent {
  kicker: string;
  headline: string;
  lede: string;
}

export interface StoryContent {
  kicker: string;
  paragraphs: string[];
}

export interface VisionContent {
  kicker: string;
  heading: string;
  note: string;
  pending: boolean;
  statement: string;
  mission: string[];
}

export interface TimelineEntry {
  year: string;
  what: string;
}

export interface TimelineContent {
  kicker: string;
  heading: string;
  note: string;
  pending: boolean;
  entries: TimelineEntry[];
}

export interface ColophonContent {
  kicker: string;
  heading: string;
  paragraphs: string[];
}

export interface Mentor {
  name: string;
  role?: string;
}

export interface Testimonial {
  quote: string;
  name?: string;
}

export interface Initiative {
  id: string;
  index: string;
  title: string;
  tag: string;
  cadence: string;
  venue: string | null;
  stage: string;
  summary: string;
  body: string;
  href?: string;
}

export interface JourneyStage {
  id: string;
  index: string;
  label: string;
  note: string;
}

export interface EventItem {
  id: string;
  title: string;
  initiative: string;
  date: string;
  endDate?: string;
  time: string | null;
  venue: string | null;
  audience: string | null;
  summary: string;
  turnout: string | null;
  registration: string | null;
  pending: boolean;
}

export interface FacultyMember {
  name: string;
  role: string;
  org: string;
  photo: string;
}

export interface Patron {
  name: string;
  role: string;
}

export interface TeamRole {
  role: string;
  name: string | null;
  remit: string;
}

export interface NecTeamMember {
  name: string;
  photo: string;
  role?: string;
}

export interface NecTeam {
  lead: NecTeamMember;
  members: NecTeamMember[];
  note: string;
}

export interface Stat {
  value: string;
  label: string;
  count: number | null;
  suffix?: string;
}

export interface DriveTarget {
  label: string;
  now: number;
  target: number;
  detail: string;
}

export interface DriveContent {
  note: string;
  pending: boolean;
  targets: DriveTarget[];
}

export interface GalleryAlbum {
  id: string;
  label: string;
}

export interface GalleryItem {
  file: string;
  caption: string;
  album: string;
  ratio: 'landscape' | 'portrait' | 'square';
}

export interface NecTrack {
  name: string;
  ours: boolean;
  body: string;
}

export interface NecIncentive {
  title: string;
  body: string;
}

export interface NecTimelineEntry {
  when: string;
  what: string;
}

export interface NecFaq {
  q: string;
  a: string;
}

export interface NecData {
  year: number;
  portal: string;
  organiser: string;
  hero: { eyebrow: string; title: string; lede: string };
  about: { heading: string; lead: string; paragraphs: string[] };
  goal: { heading: string; lead: string; paragraphs: string[] };
  stats: Stat[];
  tracks: NecTrack[];
  incentives: NecIncentive[];
  timeline: { note: string; pending: boolean; entries: NecTimelineEntry[] };
  guidelines: string[];
  faq: NecFaq[];
  join: { heading: string; lead: string; body: string };
}

export interface RoadmapItem {
  id: string;
  title: string;
  status: 'building' | 'planned';
  summary: string;
}
