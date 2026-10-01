import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
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
import { RevealOnScrollDirective } from '../../core/directives/reveal.directive';
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
  closing = closing;
  join = join;
  colophon = colophon;
  mentors = mentors;
  testimonials = testimonials;

  private seo = inject(SeoService);

  ngOnInit(): void {
    this.seo.set({
      title: 'About',
      description: intro.body[0],
      path: '/about/',
    });
  }
}
