import { Component, OnInit, inject } from '@angular/core';
import { websiteAv } from '../../core/data/about.data';
import { SeoService } from '../../core/services/seo.service';
import { RevealOnScrollDirective } from '../../core/directives/reveal.directive';
import { AwaitingPanelComponent } from '../../shared/ui/awaiting-panel.component';

@Component({
  selector: 'app-website-av',
  standalone: true,
  imports: [RevealOnScrollDirective, AwaitingPanelComponent],
  templateUrl: './website-av.component.html',
})
export class WebsiteAvComponent implements OnInit {
  websiteAv = websiteAv;

  private seo = inject(SeoService);

  ngOnInit(): void {
    this.seo.set({
      title: 'Website AV',
      description: websiteAv.note,
      path: '/website-av/',
    });
  }
}
