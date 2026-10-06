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
  description?: string;
  children?: NavItem[];
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

export interface ReachContent {
  kicker: string;
  heading: string;
  lede: string;
  layers: string[];
}

export interface SpotlightContent {
  kicker: string;
  heading: string;
  note: string;
}

export interface WhyContent {
  kicker: string;
  heading: string;
  lede: string;
  questions: string[];
  body: string;
}

export interface ActionCard {
  title: string;
  body: string;
}

export interface WhatHappensContent {
  kicker: string;
  heading: string;
  cards: ActionCard[];
}

export interface WayItem {
  left: string;
  right: string;
  note: string;
}

export interface EcellWayContent {
  kicker: string;
  heading: string;
  items: WayItem[];
}

export interface EcosystemContent {
  kicker: string;
  heading: string;
  paragraphs: string[];
}

export interface IdentityContent {
  kicker: string;
  heading: string;
  paragraphs: string[];
}

export interface DreamEcellContent {
  kicker: string;
  heading: string;
  paragraphs: string[];
}

export interface CreateItem {
  label: string;
  body: string;
}

export interface WhatWeCreateContent {
  kicker: string;
  heading: string;
  items: CreateItem[];
}

export interface AlumniContent {
  kicker: string;
  heading: string;
  paragraphs: string[];
}

export interface ClosingContent {
  kicker: string;
  heading: string;
  paragraphs: string[];
}

export interface JoinContent {
  kicker: string;
  heading: string;
  lede: string;
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

export interface EventImage {
  src: string;
  alt: string;
}

export interface EventItem {
  id: string;
  title: string;
  /** Omit when the event doesn't belong to one of the standing initiatives. */
  initiative?: string;
  date: string;
  endDate?: string;
  time: string | null;
  venue: string | null;
  audience: string | null;
  summary: string;
  turnout: string | null;
  registration: string | null;
  pending: boolean;
  /** Longer writeup for the expanded row, beyond `summary`. */
  description?: string;
  /** Post image first, any additional photos after. */
  gallery?: EventImage[];
  speaker?: { name: string; designation?: string; org?: string };
  registrationLink?: string;
  linkedinUrl?: string;
  hashtags?: string[];
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

/** A named student on the roll. `photo` is optional because the site has
 * never had a portrait for anyone — `.avatar-initials` is the real
 * treatment, not a fallback waiting to be replaced. `verticalSlug` is
 * optional and currently unset for everyone: which student works in which
 * vertical is not recorded anywhere, and is not guessed. */
export interface NecTeamMember {
  name: string;
  role?: string;
  photo?: string;
  verticalSlug?: string;
}

export interface NecTeam {
  lead: NecTeamMember;
  members: NecTeamMember[];
  note: string;
}

/** A vertical is documented by what it is responsible for, not by who
 * staffs it or how it has performed. There is deliberately no `head`,
 * `members` or `stats` field: no vertical head is recorded, no
 * member-to-vertical mapping exists, and no metric here has ever been
 * measured. Adding those fields back is what invited invented content
 * the first time.
 *
 * `heroImage` is nullable rather than optional-by-omission so that the
 * absence is explicit: Public Relations has no illustration of its own, and
 * renders as a typographic panel by design (see `vertical-card`). Don't
 * borrow another section's artwork to even out the row.
 *
 * `relatedWork` points at a real route on this site where the output of
 * this vertical can actually be seen — navigation, not a claim. */
export interface VerticalEcosystem {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  description: string;
  heroImage: string | null;
  displayOrder: number;
  responsibilities: string[];
  relatedWork: { label: string; href: string } | null;
  isActive: boolean;
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

export interface NecTaskProgress {
  title: string;
  points: number;
  maxPoints: number;
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
  progress: { heading: string; lead: string; tasks: NecTaskProgress[] };
  timeline: { note: string; pending: boolean; entries: NecTimelineEntry[] };
  guidelines: string[];
  faq: NecFaq[];
  join: { heading: string; lead: string; body: string };
}

export interface PodcastContent {
  kicker: string;
  heading: string;
  note: string;
}

export interface WebsiteAvContent {
  kicker: string;
  heading: string;
  note: string;
}

export interface SearchEntry {
  label: string;
  href: string;
  section: string;
  keywords: string[];
}

export interface BlogPost {
  id: string;
  title: string;
  author: string;
  date: string;
  url: string | null;
  summary: string;
  pending: boolean;
  slug?: string;
  series?: string;
  seriesPart?: number;
  readTime?: string;
  week?: string;
  category?: string;
  heroConcept?: string;
}

export interface SourceLink {
  title: string;
  url: string;
}

export interface StudentExerciseItem {
  num: string;
  title?: string;
  text: string;
  placeholder?: string;
}

export interface CaseStudyData {
  company: string;
  founders?: string;
  foundedYear?: string;
  headline: string;
  narrative: string[];
  steps?: { title: string; desc: string }[];
  outcome?: string;
}

export interface InfographicData {
  id: string;
  type: 'comparison' | 'sources-radial' | 'timeline' | 'mvp-spectrum' | 'business-stack' | 'funnel' | 'scale-balance' | 'unit-economics' | 'growth-chart' | 'master-flow';
  title: string;
  subtitle?: string;
  content: any;
}

export interface ArticleSection {
  id: string;
  heading: string;
  subheading?: string;
  paragraphs: string[];
  pullQuote?: { quote: string; author?: string; note?: string };
  callout?: { title?: string; text: string; icon?: string };
  caseStudy?: CaseStudyData;
  infographic?: InfographicData;
  listItems?: string[];
}

export interface BlogArticle {
  id: string;
  slug: string;
  series: string;
  seriesPart: number;
  totalParts: number;
  week: string;
  readTime: string;
  category: string;
  title: string;
  subtitle: string;
  author: string;
  date: string;
  publishedAt: string;
  heroTagline: string;
  heroConcept: string;
  introParagraphs: string[];
  sections: ArticleSection[];
  studentExercise: {
    heading: string;
    subtitle: string;
    items: StudentExerciseItem[];
    outcome: string;
  };
  nextArticleBridge: {
    heading: string;
    text: string;
  };
  sources: SourceLink[];
  seo: {
    title: string;
    description: string;
    primaryKeyword: string;
    secondaryKeywords: string[];
    suggestedSlug: string;
  };
  social: {
    linkedIn: string;
    instagram: string;
    hashtags: string[];
  };
  nextArticle?: {
    part: number;
    title: string;
    slug: string;
    teaser: string;
  };
  previousArticle?: {
    part: number;
    title: string;
    slug: string;
  };
}

export interface RoadmapItem {
  id: string;
  title: string;
  status: 'building' | 'planned';
  summary: string;
}
