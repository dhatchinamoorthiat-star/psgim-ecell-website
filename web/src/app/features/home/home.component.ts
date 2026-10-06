import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, OnInit, PLATFORM_ID, ViewChild, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { hero, intro } from '../../core/data/about.data';
import { why, whatHappens, ecellWay } from '../../core/data/home.data';
import { initiatives, stages, toInitiativeRows } from '../../core/data/initiatives.data';
import { nec, preliminaryTotals } from '../../core/data/nec.data';
import { stats, drive } from '../../core/data/stats.data';
import { site, primaryCta } from '../../core/data/site.data';
import {
  baseEcosystem,
  eventEntries,
  ecosystemStats,
  categoryLabels,
  categoryOrder,
  IndexCategory,
  IndexEntry,
} from '../../core/data/ecosystem.data';
import { Initiative, JourneyStage } from '../../core/models/models';
import { ContentApiService } from '../../core/services/content-api.service';
import { EventQueryResult } from '../../shared/blocks/block.types';
import { SeoService } from '../../core/services/seo.service';
import { CinematicBootService } from '../../core/services/cinematic-boot.service';
import { RevealOnScrollDirective } from '../../core/motion/directives/reveal.directive';
import { StaggerDirective } from '../../core/motion/directives/stagger.directive';
import { MorphSceneDirective } from '../../core/motion/directives/morph-scene.directive';
import { StatTileComponent } from '../../shared/ui/stat-tile.component';
import { ProgressBarComponent } from '../../shared/ui/progress-bar.component';
import { PendingFlagComponent } from '../../shared/ui/pending-flag.component';
import { AnimatedBackgroundComponent } from '../../shared/ui/animated-background/animated-background.component';
import { EditorialRowListComponent } from '../../shared/ui/editorial-row-list/editorial-row-list.component';

export type HeroPhase = 'video' | 'video-complete' | 'headline' | 'images' | 'ready';

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

export interface HeroCollageImage {
  id: string;
  src: string;
  alt: string;
  label: string;
  side: 'left' | 'right';
  frame: 'polaroid' | 'editorial' | 'rounded' | 'accent-border' | 'glass';
  rotation: number;
  aspectRatio: string;
  size: string;
  zIndex: number;
  step: number;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RevealOnScrollDirective,
    StaggerDirective,
    MorphSceneDirective,
    StatTileComponent,
    ProgressBarComponent,
    PendingFlagComponent,
    AnimatedBackgroundComponent,
    EditorialRowListComponent,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  hero = hero;
  intro = intro;
  why = why;
  whatHappens = whatHappens;
  ecellWay = ecellWay;
  initiatives = initiatives;
  /** A curated preview — the full set lives on the Initiatives page. */
  initiativeRows = toInitiativeRows('route').slice(0, 4);
  stages = stages;
  stats = stats;
  drive = drive;
  site = site;
  primaryCta = primaryCta;

  nec = nec;
  necTotals = preliminaryTotals();
  ourTrack = nec.tracks.find((t) => t.ours)?.name ?? '';
  preliminaryCleared = nec.progress.tasks.length;

  /**
   * Same canonical note as EventsComponent (both read from the CMS's
   * `published_events_*` queries now — no local copy to drift out of sync
   * with).
   */
  eventsNote =
    'Confirmed past events, sourced from our LinkedIn posts and the official 2024-25 E-Cell activity report, alongside illustrative placeholders while the rest of the calendar is finalized with the office.';

  /**
   * Populated client-side only (see `loadEvents`) — the homepage stays a
   * build-time-prerendered static route (`app.routes.server.ts`'s catch-all
   * `RenderMode.Prerender`), so a backend fetch here must not run during
   * SSR/prerender, unlike `/events` and `/blogs` which were switched to
   * `RenderMode.Server` specifically because their entire page *is* the
   * event/blog listing. Here the event teaser is a small section of an
   * otherwise static page, so the smallest correct fix is to fetch after
   * hydration instead of changing the whole homepage's render mode.
   */
  private eventsSignal = signal<EventQueryResult[]>([]);
  readonly activityRows = computed(() =>
    this.eventsSignal()
      .slice(0, 4)
      .map((ev, i) => ({
        id: `activity-${ev.slug}`,
        index: String(i + 1).padStart(2, '0'),
        title: ev.title,
        summary: ev.summary ?? '',
        tag: initiatives.find((init) => init.id === ev.related_initiative)?.tag,
        href: '/events/',
      })),
  );

  private seo = inject(SeoService);
  private bootService = inject(CinematicBootService);
  private platformId = inject(PLATFORM_ID);
  private route = inject(ActivatedRoute);
  private api = inject(ContentApiService);

  // ── COLLECTIVE INDEX DISCOVERY STATE ──
  readonly ecosystemStats = ecosystemStats;
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

  /** `baseEcosystem` plus the "Events" category, built from the same
   * API-fetched `eventsSignal` as the activity teaser and relationship
   * chain above — one fetch, three consumers, no second event source. */
  private readonly ecosystem = computed<IndexEntry[]>(() => [
    ...baseEcosystem,
    ...eventEntries(this.eventsSignal()),
  ]);

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

  @ViewChild('journeySection') journeySection?: ElementRef<HTMLElement>;
  @ViewChild('heroVideo') heroVideo?: ElementRef<HTMLVideoElement>;
  readonly arcProgress = signal(0);
  readonly litCount = signal(0);

  // 5-State Machine for Homepage Cinematic Boot Sequence
  readonly heroPhase = signal<HeroPhase>('ready');
  readonly typedLine1 = signal<string>('INNOVATE');
  readonly typedLine2 = signal<string>('TO');
  readonly typedLine3 = signal<string>('ELEVATE.');
  readonly currentCursorLine = signal<number>(3); // Line 3 persistent cursor
  readonly revealStep = signal<number>(6); // 0 = hidden, 6 = fully revealed
  /** Only buffer the hero video ahead of time when we actually intend to play it. */
  readonly heroVideoPreload = signal<'auto' | 'none'>('none');

  /** Complete collection of 11 local hero photographs (Meet the Team excluded) */
  readonly heroCollageImages: HeroCollageImage[] = [
    {
      id: 'left-1',
      src: '/illustrations/Images/WhatsApp%20Image%202026-10-02%20at%2020.35.49.jpeg',
      alt: 'E-Cell workshop and keynote session',
      label: 'Workshops & Events',
      side: 'left',
      frame: 'polaroid',
      rotation: -3,
      aspectRatio: '1 / 1',
      size: '48%',
      zIndex: 3,
      step: 1,
      top: '0%',
      left: '0%',
    },
    {
      id: 'left-2',
      src: '/illustrations/Images/WhatsApp%20Image%202026-10-02%20at%2020.32.40.jpeg',
      alt: 'Student ideation and collaboration session',
      label: 'Ideation Lab',
      side: 'left',
      frame: 'editorial',
      rotation: 3.5,
      aspectRatio: '1 / 1',
      size: '44%',
      zIndex: 2,
      step: 2,
      top: '8%',
      right: '2%',
    },
    {
      id: 'left-3',
      src: '/illustrations/Images/WhatsApp%20Image%202026-10-02%20at%2020.38.12%20(1).jpeg',
      alt: 'E-Cell heritage and origin history',
      label: 'Heritage & Roots',
      side: 'left',
      frame: 'accent-border',
      rotation: -2.5,
      aspectRatio: '3 / 4',
      size: '66%',
      zIndex: 5,
      step: 3,
      top: '38%',
      left: '-6%',
    },
    {
      id: 'left-4',
      src: '/illustrations/Images/WhatsApp%20Image%202026-10-02%20at%2020.32.40%20(1).jpeg',
      alt: 'Venture strategy session',
      label: 'Venture Strategy',
      side: 'left',
      frame: 'glass',
      rotation: 2.5,
      aspectRatio: '1 / 1',
      size: '46%',
      zIndex: 3,
      step: 4,
      top: '74%',
      left: '4%',
    },
    {
      id: 'left-5',
      src: '/illustrations/Images/WhatsApp%20Image%202026-10-02%20at%2020.37.00.jpeg',
      alt: 'Operations and logistical management',
      label: 'Operations Hub',
      side: 'left',
      frame: 'rounded',
      rotation: -3.5,
      aspectRatio: '3 / 2',
      size: '40%',
      zIndex: 4,
      step: 5,
      top: '64%',
      right: '0%',
    },
    {
      id: 'right-1',
      src: '/illustrations/Images/WhatsApp%20Image%202026-10-02%20at%2020.34.01%20(1).jpeg',
      alt: 'Building ventures and prototyping ideas',
      label: 'Pitch & Scale',
      side: 'right',
      frame: 'editorial',
      rotation: 2,
      aspectRatio: '1 / 1',
      size: '66%',
      zIndex: 5,
      step: 1,
      top: '8%',
      right: '4%',
    },
    {
      id: 'right-2',
      src: '/illustrations/Images/WhatsApp%20Image%202026-10-02%20at%2020.39.14.jpeg',
      alt: 'National Entrepreneurship Challenge competition stage',
      label: 'NEC Stage',
      side: 'right',
      frame: 'polaroid',
      rotation: -3,
      aspectRatio: '1 / 1',
      size: '54%',
      zIndex: 3,
      step: 2,
      top: '36%',
      left: '4%',
    },
    {
      id: 'right-3',
      src: '/illustrations/Images/WhatsApp%20Image%202026-10-02%20at%2020.38.13.jpeg',
      alt: 'Regional ecosystem network',
      label: 'Ecosystem',
      side: 'right',
      frame: 'glass',
      rotation: 4,
      aspectRatio: '1 / 1',
      size: '44%',
      zIndex: 1,
      step: 3,
      top: '-2%',
      left: '-2%',
    },
    {
      id: 'right-4',
      src: '/illustrations/Images/WhatsApp%20Image%202026-10-02%20at%2020.32.41.jpeg',
      alt: 'Media production and creative storytelling',
      label: 'Media Studio',
      side: 'right',
      frame: 'accent-border',
      rotation: -1.5,
      aspectRatio: '4 / 3',
      size: '60%',
      zIndex: 3,
      step: 4,
      bottom: '4%',
      right: '0%',
    },
    {
      id: 'right-5',
      src: '/illustrations/Images/WhatsApp%20Image%202026-10-02%20at%2020.34.01.jpeg',
      alt: 'Technical systems and web platform',
      label: 'Tech Systems',
      side: 'right',
      frame: 'rounded',
      rotation: 3,
      aspectRatio: '1 / 1',
      size: '42%',
      zIndex: 1,
      step: 5,
      bottom: '22%',
      right: '-6%',
    },
    {
      id: 'right-6',
      src: '/illustrations/Images/WhatsApp%20Image%202026-10-02%20at%2020.38.12.jpeg',
      alt: 'Podcast recording and audio broadcasting',
      label: 'Audio Studio',
      side: 'right',
      frame: 'polaroid',
      rotation: 4.5,
      aspectRatio: '1 / 1',
      size: '36%',
      zIndex: 5,
      step: 6,
      top: '48%',
      right: '-8%',
    },
  ];

  readonly heroCollageLeft = computed(() =>
    this.heroCollageImages.filter((img) => img.side === 'left')
  );

  readonly heroCollageRight = computed(() =>
    this.heroCollageImages.filter((img) => img.side === 'right')
  );

  readonly typedLine3Main = computed(() => {
    const text = this.typedLine3();
    return text.endsWith('.') ? text.slice(0, -1) : text;
  });

  readonly typedLine3HasPeriod = computed(() => {
    return this.typedLine3().endsWith('.') || this.heroPhase() === 'ready';
  });

  private activeTimers: any[] = [];
  private safetyTimer?: any;
  private videoListenersAttached = false;

  ngOnInit(): void {
    this.seo.set({
      title: site.title,
      description: site.description,
      path: '/',
    });

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
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!reduced && !this.bootService.hasBooted() && this.bootService.shouldPlayVideo()) {
        this.heroVideoPreload.set('auto');
      }
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
    const id = entry.id.replace(/^initiative-/, '');
    if (id === 'nec-drive' || id === 'bootcamp') {
      return id;
    }
    return null;
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

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduced || this.bootService.hasBooted()) {
        this.setToReadyState();
      } else if (this.bootService.shouldPlayVideo()) {
        this.bootService.markAsBooted();
        this.bootService.markVideoPlayed();
        this.startCinematicSequence();
      } else {
        this.bootService.markAsBooted();
        this.startTypingSequence();
      }

      this.onScroll();
    }
  }

  private startCinematicSequence(): void {
    this.heroPhase.set('video');
    this.typedLine1.set('');
    this.typedLine2.set('');
    this.typedLine3.set('');
    this.currentCursorLine.set(0);
    this.revealStep.set(0);

    if (this.heroVideo?.nativeElement && !this.videoListenersAttached) {
      const v = this.heroVideo.nativeElement;
      v.muted = true;
      v.currentTime = 0;
      this.videoListenersAttached = true;

      const handleEnded = () => this.onVideoEnded();
      v.addEventListener('ended', handleEnded, { once: true });

      const handleTimeUpdate = () => {
        if (v.ended || (v.duration > 0 && v.currentTime >= v.duration - 0.15)) {
          v.removeEventListener('timeupdate', handleTimeUpdate);
          this.onVideoEnded();
        }
      };
      v.addEventListener('timeupdate', handleTimeUpdate);

      const playPromise = v.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          this.onVideoError();
        });
      }
    } else {
      this.onVideoEnded();
      return;
    }

    this.safetyTimer = setTimeout(() => {
      if (this.heroPhase() === 'video') {
        this.onVideoEnded();
      }
    }, 12000);
  }

  private startTypingSequence(): void {
    this.heroPhase.set('headline');
    this.typedLine1.set('');
    this.typedLine2.set('');
    this.typedLine3.set('');
    this.currentCursorLine.set(1);
    this.revealStep.set(0);

    this.typeText('INNOVATE', this.typedLine1, 1, () => {
      this.typeText('TO', this.typedLine2, 2, () => {
        this.typeText('ELEVATE.', this.typedLine3, 3, () => {
          this.heroPhase.set('images');
          this.startStaggeredReveal();
        });
      });
    });
  }

  private typeText(
    text: string,
    target: ReturnType<typeof signal<string>>,
    lineNum: number,
    done: () => void,
  ): void {
    this.currentCursorLine.set(lineNum);
    let i = 0;
    const tick = () => {
      if (i < text.length) {
        i++;
        target.set(text.slice(0, i));
        const t = setTimeout(tick, 45 + Math.random() * 30);
        this.activeTimers.push(t);
      } else {
        const t = setTimeout(done, 120);
        this.activeTimers.push(t);
      }
    };
    tick();
  }

  onVideoEnded(): void {
    if (this.safetyTimer) {
      clearTimeout(this.safetyTimer);
      this.safetyTimer = undefined;
    }

    if (this.heroPhase() !== 'video') {
      return;
    }

    this.heroPhase.set('video-complete');

    const t1 = setTimeout(() => {
      this.heroPhase.set('headline');
      this.typeText('INNOVATE', this.typedLine1, 1, () => {
        this.typeText('TO', this.typedLine2, 2, () => {
          this.typeText('ELEVATE.', this.typedLine3, 3, () => {
            this.heroPhase.set('images');
            this.startStaggeredReveal();
          });
        });
      });
    }, 300);
    this.activeTimers.push(t1);
  }

  onVideoError(): void {
    if (this.heroPhase() === 'video') {
      this.setToReadyState();
    }
  }

  private startStaggeredReveal(): void {
    const steps = [1, 2, 3, 4, 5, 6];
    let idx = 0;

    const revealNext = () => {
      if (idx < steps.length) {
        this.revealStep.set(steps[idx]);
        idx++;
        const t = setTimeout(revealNext, 90);
        this.activeTimers.push(t);
      } else {
        // Phase 5 / 6: Complete hero settles into ready state
        this.heroPhase.set('ready');
      }
    };

    revealNext();
  }

  private setToReadyState(): void {
    if (this.safetyTimer) {
      clearTimeout(this.safetyTimer);
      this.safetyTimer = undefined;
    }
    this.heroPhase.set('ready');
    this.typedLine1.set('INNOVATE');
    this.typedLine2.set('TO');
    this.typedLine3.set('ELEVATE.');
    this.currentCursorLine.set(3);
    this.revealStep.set(6);
  }

  @HostListener('window:scroll')
  onScroll(): void {
    if (!isPlatformBrowser(this.platformId) || !this.journeySection) return;
    const el = this.journeySection.nativeElement;
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight;
    const start = vh * 0.9;
    const end = vh * 0.38;
    const total = start - end;
    const traveled = start - rect.top;
    const progress = Math.max(0, Math.min(1, traveled / total));
    this.arcProgress.set(progress);
    this.litCount.set(Math.round(progress * this.stages.length));
  }

  ngOnDestroy(): void {
    if (this.safetyTimer) {
      clearTimeout(this.safetyTimer);
    }
    this.activeTimers.forEach((t) => clearTimeout(t));
    this.activeTimers = [];
  }
}
