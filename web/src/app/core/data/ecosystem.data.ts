import { necTeamSize, verticalEcosystems } from './team.data';
import { initiatives } from './initiatives.data';
import { blogs } from './blogs.data';

export type IndexCategory = 'people' | 'verticals' | 'initiatives' | 'events' | 'stories' | 'explore';

export interface IndexEntry {
  id: string;
  name: string;
  category: IndexCategory;
  tag: string;
  href: string;
  pending: boolean;
  index?: string;
  transitionName?: string;
}

function peopleEntries(): IndexEntry[] {
  return [
    {
      id: 'people-ecosystem',
      name: 'The People Behind the Cell',
      category: 'people',
      tag: `${necTeamSize} student members`,
      href: '/meet-the-team/',
      pending: false,
    },
  ];
}

function verticalEntries(): IndexEntry[] {
  return verticalEcosystems
    .filter((v) => v.isActive)
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((v) => ({
      id: `vertical-${v.slug}`,
      name: v.name,
      category: 'verticals' as IndexCategory,
      tag: v.relatedWork?.label ?? 'Vertical',
      href: `/meet-the-team/vertical/${v.slug}`,
      pending: false,
      transitionName: `vt-vertical-${v.slug}`,
    }));
}

function initiativeEntries(): IndexEntry[] {
  return initiatives.map((item) => ({
    id: `initiative-${item.id}`,
    name: item.title,
    category: 'initiatives' as IndexCategory,
    tag: item.tag,
    href: item.href ?? '/initiatives/',
    pending: false,
    index: item.index,
  }));
}

/**
 * Takes the already-fetched `published_events_*` results rather than
 * importing a static array — the Collective Index's "Events" category must
 * read from the same canonical backend source as `/events` and the
 * homepage's activity teaser, not a third copy of the data.
 */
export function eventEntries(events: { slug: string; title: string; starts_at?: string | null; pending?: boolean }[]): IndexEntry[] {
  return events
    .filter((ev) => !ev.pending)
    .map((ev) => ({
      id: `event-${ev.slug}`,
      name: ev.title,
      category: 'events' as IndexCategory,
      tag: ev.starts_at ? ev.starts_at.slice(0, 10) : '',
      href: '/events/',
      pending: ev.pending ?? false,
    }));
}

function storyEntries(): IndexEntry[] {
  return blogs.map((post) => ({
    id: `story-${post.id}`,
    name: post.title,
    category: 'stories' as IndexCategory,
    tag: post.readTime ?? 'Story',
    href: post.url ?? '/blogs/',
    pending: post.pending,
  }));
}

function exploreEntries(): IndexEntry[] {
  const pages: { name: string; tag: string; href: string }[] = [
    { name: 'About E-Cell', tag: 'Overview', href: '/about/' },
    { name: 'Our Journey', tag: 'Origin story', href: '/origin/' },
    { name: 'Vision & Mission', tag: 'Purpose', href: '/vision-mission/' },
    { name: 'History', tag: 'Timeline', href: '/history/' },
    { name: 'Gallery', tag: 'Photos', href: '/gallery/' },
    { name: 'NEC 2026', tag: 'National challenge', href: '/nec/' },
    { name: 'Podcast', tag: 'UNPITCHED', href: '/podcast/' },
    { name: 'Join the Cell', tag: 'Get involved', href: '/contact/' },
  ];

  return pages.map((p) => ({
    id: `explore-${p.href.replace(/\//g, '-').replace(/^-|-$/g, '')}`,
    name: p.name,
    category: 'explore' as IndexCategory,
    tag: p.tag,
    href: p.href,
    pending: false,
  }));
}

/** The non-event categories — static and build-time-safe. `events` are
 * merged in by each caller (`HomeComponent`, `HomeExperimentComponent`,
 * `IndexExperimentComponent`) once fetched from the API via `eventEntries`
 * below — one canonical event source for all three. */
export const baseEcosystem: IndexEntry[] = [
  ...peopleEntries(),
  ...verticalEntries(),
  ...initiativeEntries(),
  ...storyEntries(),
  ...exploreEntries(),
];

export const ecosystemStats = {
  people: necTeamSize,
  verticals: verticalEcosystems.filter((v) => v.isActive).length,
  initiatives: initiatives.length,
  stories: blogs.length,
};

export const categoryLabels: Record<IndexCategory, string> = {
  people: 'People',
  verticals: 'Verticals',
  initiatives: 'Initiatives',
  events: 'Events',
  stories: 'Stories',
  explore: 'Explore',
};

export const categoryOrder: IndexCategory[] = ['people', 'verticals', 'initiatives', 'events', 'stories', 'explore'];
