import { Component, OnInit, inject } from '@angular/core';
import { spotlight } from '../../core/data/about.data';
import { SeoService } from '../../core/services/seo.service';
import { RevealOnScrollDirective } from '../../core/directives/reveal.directive';
import { AwaitingPanelComponent } from '../../shared/ui/awaiting-panel.component';

@Component({
  selector: 'app-spotlight',
  standalone: true,
  imports: [RevealOnScrollDirective, AwaitingPanelComponent],
  templateUrl: './spotlight.component.html',
})
export class SpotlightComponent implements OnInit {
  spotlight = spotlight;

  private seo = inject(SeoService);

  ngOnInit(): void {
    this.seo.set({
      title: 'Spotlight',
      description: spotlight.note,
      path: '/spotlight/',
    });
  }
}
