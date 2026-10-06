import { Component, OnInit, HostListener, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import {
  baseEcosystem,
  eventEntries,
  ecosystemStats,
  categoryLabels,
  categoryOrder,
  IndexCategory,
  IndexEntry,
} from '../../core/data/ecosystem.data';
import { initiatives, stages } from '../../core/data/initiatives.data';
import { nec } from '../../core/data/nec.data';
import { Initiative, JourneyStage } from '../../core/models/models';
import { ContentApiService } from '../../core/services/content-api.service';
import { EventQueryResult } from '../../shared/blocks/block.types';
import { SeoService } from '../../core/services/seo.service';
import { RevealOnScrollDirective } from '../../core/motion/directives/reveal.directive';
import { StaggerDirective } from '../../core/motion/directives/stagger.directive';

export interface RelationshipChain {
  initiative: Initiative;
  stage: JourneyStage | null;
  event: EventQueryResult | null;
  nec: {
    title: string;
    organiser: string;
    track: string;
    href: string;
    summary: string;
  } | null;
}

@Component({
  selector: 'app-home-experiment',
  standalone: true,
  imports: [CommonModule, RouterLink, RevealOnScrollDirective, StaggerDirective],
  templateUrl: './home-experiment.component.html',
  styleUrl: './home-experiment.component.css',
})
export class HomeExperimentComponent implements OnInit {
  private seo = inject(SeoService);
  private route = inject(ActivatedRoute);
  private api = inject(ContentApiService);
  private platformId = inject(PLATFORM_ID);

  readonly stats = ecosystemStats;
  readonly categoryOrder = categoryOrder;
  readonly categoryLabels = categoryLabels;

  readonly activeFilter = signal<IndexCategory | 'all'>('all');
  readonly selectedInitiativeId = signal<string | null>(null);

  /** Populated client-side only — this route is build-time-prerendered
   * (app.routes.server.ts's catch-all), so a backend fetch here must not
   * run during SSR/prerender. Same pattern as HomeComponent. */
  private readonly eventsSignal = signal<EventQueryResult[]>([]);

  private readonly ecosystem = computed<IndexEntry[]>(() => [
    ...baseEcosystem,
    ...eventEntries(this.eventsSignal()),
  ]);

  readonly relationshipChain = computed<RelationshipChain | null>(() => {
    const initId = this.selectedInitiativeId();
    if (!initId) return null;

    const initiative = initiatives.find((i) => i.id === initId);
    if (!initiative) return null;

    const stage = stages.find((s) => s.id === initiative.stage) ?? null;
    const event = this.eventsSignal().find((e) => e.related_initiative === initiative.id) ?? null;

    let necData: RelationshipChain['nec'] = null;
    if (initiative.id === 'nec-drive' || initiative.href === '/nec/') {
      necData = {
        title: nec.hero.title,
        organiser: nec.organiser,
        track: nec.tracks.find((t) => t.ours)?.name ?? 'Advanced Track',
        href: '/nec/',
        summary: nec.hero.lede,
      };
    }

    return { initiative, stage, event, nec: necData };
  });

  readonly grouped = computed(() => {
    const filter = this.activeFilter();
    const categories = filter === 'all' ? categoryOrder : [filter];
    const ecosystem = this.ecosystem();

    return categories
      .map((cat) => ({
        key: cat,
        label: categoryLabels[cat],
        entries: ecosystem.filter((e) => e.category === cat),
      }))
      .filter((g) => g.entries.length > 0);
  });

  readonly totalCount = computed(() => {
    return this.grouped().reduce((sum, g) => sum + g.entries.length, 0);
  });

  readonly filters: { key: IndexCategory | 'all'; label: string }[] = [
    { key: 'all', label: 'All' },
    ...categoryOrder.map((cat) => ({ key: cat, label: categoryLabels[cat] })),
  ];

  ngOnInit(): void {
    this.seo.set({
      title: 'PSGIM E-Cell — Living Public Ecosystem',
      description:
        'Ideas today. Impact tomorrow. PSGIM E-Cell is a living ecosystem of student builders, startup verticals, initiatives, and national campaigns.',
      path: '/home-experiment/',
    });

    // Check queryParam or fragment for initial initiative selection
    this.route.queryParams.subscribe((params) => {
      if (params['initiative'] && initiatives.some((i) => i.id === params['initiative'])) {
        this.selectInitiative(params['initiative']);
      }
    });

    this.route.fragment.subscribe((frag) => {
      if (frag && initiatives.some((i) => i.id === frag)) {
        this.selectInitiative(frag);
      }
    });

    if (isPlatformBrowser(this.platformId)) {
      void this.loadEvents();
    }
  }

  private async loadEvents(): Promise<void> {
    const [upcoming, past] = await Promise.all([
      this.api.getDynamic<EventQueryResult>('published_events_upcoming', { sort: 'starts_at_asc' }),
      this.api.getDynamic<EventQueryResult>('published_events_past', { sort: 'starts_at_desc' }),
    ]);
    this.eventsSignal.set([...upcoming.results, ...past.results]);
  }

  setFilter(key: IndexCategory | 'all'): void {
    this.activeFilter.set(key);
  }

  selectInitiative(id: string | null): void {
    this.selectedInitiativeId.set(id);
  }

  toggleInitiative(id: string): void {
    if (this.selectedInitiativeId() === id) {
      this.selectedInitiativeId.set(null);
    } else {
      this.selectedInitiativeId.set(id);
    }
  }

  getInitiativeIdFromEntry(entry: IndexEntry): string | null {
    if (entry.category !== 'initiatives') return null;
    return entry.id.replace(/^initiative-/, '');
  }

  @HostListener('window:keydown.escape')
  onEscapeKey(): void {
    if (this.selectedInitiativeId()) {
      this.selectInitiative(null);
    }
  }

  trackGroup(_: number, group: { key: string }): string {
    return group.key;
  }

  trackEntry(_: number, entry: IndexEntry): string {
    return entry.id;
  }
}
