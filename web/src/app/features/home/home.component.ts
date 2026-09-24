import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, OnInit, PLATFORM_ID, ViewChild, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { hero, intro } from '../../core/data/about.data';
import { why, whatHappens, ecellWay } from '../../core/data/home.data';
import { initiatives, stages } from '../../core/data/initiatives.data';
import { events, splitEvents } from '../../core/data/events.data';
import { stats, drive } from '../../core/data/stats.data';
import { gallery } from '../../core/data/gallery.data';
import { site, primaryCta } from '../../core/data/site.data';
import { SeoService } from '../../core/services/seo.service';
import { RevealOnScrollDirective } from '../../core/directives/reveal.directive';
import { StatTileComponent } from '../../shared/ui/stat-tile.component';
import { ProgressBarComponent } from '../../shared/ui/progress-bar.component';
import { PendingFlagComponent } from '../../shared/ui/pending-flag.component';

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
  stages = stages;
  stats = stats;
  drive = drive;
  gallery = gallery.slice(0, 4);
  site = site;
  primaryCta = primaryCta;
  upcoming = splitEvents(events).upcoming.slice(0, 3);

  private seo = inject(SeoService);
  private platformId = inject(PLATFORM_ID);

  @ViewChild('journeySection') journeySection?: ElementRef<HTMLElement>;
  @ViewChild('heroVideo') heroVideo?: ElementRef<HTMLVideoElement>;
  readonly arcProgress = signal(0);
  readonly litCount = signal(0);
  readonly muted = signal(true);

  toggleSound(): void {
    const video = this.heroVideo?.nativeElement;
    if (!video) return;
    video.muted = !video.muted;
    this.muted.set(video.muted);
  }

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
        this.playHeroVideo();
      }
    }
  }

  /**
   * Hydration reuses the server-rendered <video>, and some browsers don't
   * honour the `autoplay` attribute on a node that's handed to them already
   * attached rather than parsed fresh — so kick playback explicitly once the
   * view is ready, same as ecellmit.in's hero does.
   */
  private playHeroVideo(): void {
    const video = this.heroVideo?.nativeElement;
    if (!video) return;
    video.muted = true;
    video.play().catch(() => {
      // Autoplay was blocked (e.g. low-power mode) — the poster frame and
      // sound toggle still let a visitor start it by hand.
    });
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
