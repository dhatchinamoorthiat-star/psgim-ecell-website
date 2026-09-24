import { Component, OnInit, inject } from '@angular/core';
import { podcast } from '../../core/data/about.data';
import { SeoService } from '../../core/services/seo.service';
import { RevealOnScrollDirective } from '../../core/directives/reveal.directive';
import { AwaitingPanelComponent } from '../../shared/ui/awaiting-panel.component';

@Component({
  selector: 'app-podcast',
  standalone: true,
  imports: [RevealOnScrollDirective, AwaitingPanelComponent],
  templateUrl: './podcast.component.html',
})
export class PodcastComponent implements OnInit {
  podcast = podcast;

  private seo = inject(SeoService);

  ngOnInit(): void {
    this.seo.set({
      title: 'Podcast',
      description: podcast.note,
      path: '/podcast/',
    });
  }
}
