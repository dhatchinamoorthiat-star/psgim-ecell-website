import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  hero,
  intro,
  story,
  vision,
  timeline,
  reach,
  spotlight,
  closing,
  join,
  colophon,
  mentors,
  testimonials,
  toMissionRows,
  toBeliefRows,
} from '../../core/data/about.data';
import { toInitiativeRows } from '../../core/data/initiatives.data';
import { SeoService } from '../../core/services/seo.service';
import { RevealOnScrollDirective } from '../../core/motion/directives/reveal.directive';
import { StaggerDirective } from '../../core/motion/directives/stagger.directive';
import { PendingFlagComponent } from '../../shared/ui/pending-flag.component';
import { AwaitingPanelComponent } from '../../shared/ui/awaiting-panel.component';
import { EditorialRowListComponent } from '../../shared/ui/editorial-row-list/editorial-row-list.component';
import { EditorialTimelineComponent } from '../../shared/ui/editorial-timeline/editorial-timeline.component';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RevealOnScrollDirective,
    StaggerDirective,
    PendingFlagComponent,
    AwaitingPanelComponent,
    EditorialRowListComponent,
    EditorialTimelineComponent,
  ],
  templateUrl: './about.component.html',
})
export class AboutComponent implements OnInit {
  hero = hero;
  intro = intro;
  story = story;
  initiativeRows = toInitiativeRows('route');
  vision = vision;
  missionRows = toMissionRows();
  beliefRows = toBeliefRows();
  reach = reach;
  spotlight = spotlight;
  timeline = timeline;
  timelineEntries = timeline.entries.map((e) => ({ when: e.year, what: e.what }));
  closing = closing;
  join = join;
  colophon = colophon;
  mentors = mentors;
  testimonials = testimonials;

  private seo = inject(SeoService);
  private platformId = inject(PLATFORM_ID);

  /** Readers who ask for reduced motion get the still frame, not the stinger. */
  readonly autoplayStoryLogo =
    isPlatformBrowser(this.platformId) &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  ngOnInit(): void {
    this.seo.set({
      title: 'About',
      description: intro.body[0],
      path: '/about/',
    });
  }
}
