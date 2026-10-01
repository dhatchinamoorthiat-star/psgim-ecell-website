import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, OnInit, PLATFORM_ID, ViewChild, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { hero, intro } from '../../core/data/about.data';
import { why, whatHappens, ecellWay } from '../../core/data/home.data';
import { initiatives, stages, toInitiativeRows } from '../../core/data/initiatives.data';
import { events, eventsNote } from '../../core/data/events.data';
import { nec, preliminaryTotals } from '../../core/data/nec.data';
import { stats, drive } from '../../core/data/stats.data';
import { site, primaryCta } from '../../core/data/site.data';
import { SeoService } from '../../core/services/seo.service';
import { RevealOnScrollDirective } from '../../core/directives/reveal.directive';
import { StatTileComponent } from '../../shared/ui/stat-tile.component';
import { ProgressBarComponent } from '../../shared/ui/progress-bar.component';
import { PendingFlagComponent } from '../../shared/ui/pending-flag.component';
import { AnimatedBackgroundComponent } from '../../shared/ui/animated-background/animated-background.component';
import { EditorialRowListComponent } from '../../shared/ui/editorial-row-list/editorial-row-list.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RevealOnScrollDirective,
    StatTileComponent,
    ProgressBarComponent,
    PendingFlagComponent,
    AnimatedBackgroundComponent,
    EditorialRowListComponent,
  ],
  templateUrl: './home.component.html',
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
   * Programme activity rather than a fixtures list. Titles and summaries are
   * real descriptions of what the Cell runs; the dates behind them are not
   * confirmed, which is why no date is surfaced here and `eventsNote` leads
   * the section.
   */
  eventsNote = eventsNote;
  activityRows = events.slice(0, 4).map((ev, i) => ({
    id: `activity-${ev.id}`,
    index: String(i + 1).padStart(2, '0'),
    title: ev.title,
    summary: ev.summary,
    tag: initiatives.find((init) => init.id === ev.initiative)?.tag,
    href: '/events/',
  }));

  private seo = inject(SeoService);
  private platformId = inject(PLATFORM_ID);

  @ViewChild('journeySection') journeySection?: ElementRef<HTMLElement>;
  readonly arcProgress = signal(0);
  readonly litCount = signal(0);

  ngOnInit(): void {
    this.seo.set({
      title: site.title,
      description: site.description,
      path: '/',
    });
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduced) {
        this.arcProgress.set(1);
        this.litCount.set(this.stages.length);
      } else {
        this.onScroll();
      }
    }
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

  ngOnDestroy(): void {}
}
