import { Component, OnInit, HostListener, computed, inject, signal } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import {
  ecosystem,
  ecosystemStats,
  categoryLabels,
  categoryOrder,
  IndexCategory,
  IndexEntry,
} from '../../core/data/ecosystem.data';
import { initiatives, stages } from '../../core/data/initiatives.data';
import { events } from '../../core/data/events.data';
import { nec } from '../../core/data/nec.data';
import { Initiative, JourneyStage, EventItem } from '../../core/models/models';
import { SeoService } from '../../core/services/seo.service';
import { RevealOnScrollDirective } from '../../core/motion/directives/reveal.directive';
import { StaggerDirective } from '../../core/motion/directives/stagger.directive';

export interface RelationshipChain {
  initiative: Initiative;
  stage: JourneyStage | null;
  event: EventItem | null;
  nec: {
    title: string;
    organiser: string;
    track: string;
    href: string;
    summary: string;
  } | null;
}

@Component({
  selector: 'app-index-experiment',
  standalone: true,
  imports: [RouterLink, RevealOnScrollDirective, StaggerDirective],
  templateUrl: './index-experiment.component.html',
  styleUrl: './index-experiment.component.css',
})
export class IndexExperimentComponent implements OnInit {
  private seo = inject(SeoService);
  private route = inject(ActivatedRoute);

  readonly stats = ecosystemStats;
  readonly categoryOrder = categoryOrder;
  readonly categoryLabels = categoryLabels;

  readonly activeFilter = signal<IndexCategory | 'all'>('all');
  readonly selectedInitiativeId = signal<string | null>(null);

  readonly relationshipChain = computed<RelationshipChain | null>(() => {
    const initId = this.selectedInitiativeId();
    if (!initId) return null;

    const initiative = initiatives.find((i) => i.id === initId);
    if (!initiative) return null;

    const stage = stages.find((s) => s.id === initiative.stage) ?? null;
    const event = events.find((e) => e.initiative === initiative.id) ?? null;

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
      title: 'The Collective Index',
      description:
        `${this.stats.people} people, ${this.stats.verticals} verticals, ${this.stats.initiatives} initiatives — everything inside PSGIM E-Cell.`,
      path: '/index-experiment/',
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
