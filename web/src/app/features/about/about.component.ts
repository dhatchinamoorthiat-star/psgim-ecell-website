import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { hero, intro, story, vision, timeline, colophon, mentors, testimonials } from '../../core/data/about.data';
import { SeoService } from '../../core/services/seo.service';
import { RevealOnScrollDirective } from '../../core/directives/reveal.directive';
import { PendingFlagComponent } from '../../shared/ui/pending-flag.component';
import { AwaitingPanelComponent } from '../../shared/ui/awaiting-panel.component';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, RevealOnScrollDirective, PendingFlagComponent, AwaitingPanelComponent],
  templateUrl: './about.component.html',
})
export class AboutComponent implements OnInit {
  hero = hero;
  intro = intro;
  story = story;
  vision = vision;
  timeline = timeline;
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
