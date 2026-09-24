import { Component, OnInit, inject } from '@angular/core';
import { NgIf } from '@angular/common';
import { timeline } from '../../core/data/about.data';
import { SeoService } from '../../core/services/seo.service';
import { RevealOnScrollDirective } from '../../core/directives/reveal.directive';
import { PendingFlagComponent } from '../../shared/ui/pending-flag.component';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [NgIf, RevealOnScrollDirective, PendingFlagComponent],
  templateUrl: './history.component.html',
})
export class HistoryComponent implements OnInit {
  timeline = timeline;

  private seo = inject(SeoService);

  ngOnInit(): void {
    this.seo.set({
      title: 'History',
      description: timeline.heading,
      path: '/history/',
    });
  }
}
