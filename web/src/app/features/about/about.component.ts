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
  ecosystem,
  identity,
  dreamEcell,
  alumni,
  closing,
  join,
  colophon,
  mentors,
  testimonials,
} from '../../core/data/about.data';
import { SeoService } from '../../core/services/seo.service';
import { RevealOnScrollDirective } from '../../core/directives/reveal.directive';
import { PendingFlagComponent } from '../../shared/ui/pending-flag.component';
import { AwaitingPanelComponent } from '../../shared/ui/awaiting-panel.component';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, RouterLink, RevealOnScrollDirective, PendingFlagComponent, AwaitingPanelComponent],
  templateUrl: './about.component.html',
})
export class AboutComponent implements OnInit {
  hero = hero;
  intro = intro;
  story = story;
  vision = vision;
  reach = reach;
  spotlight = spotlight;
  ecosystem = ecosystem;
  identity = identity;
  dreamEcell = dreamEcell;
  timeline = timeline;
  alumni = alumni;
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
