import { Component, OnInit, inject } from '@angular/core';
import { reach } from '../../core/data/about.data';
import { SeoService } from '../../core/services/seo.service';
import { RevealOnScrollDirective } from '../../core/directives/reveal.directive';

@Component({
  selector: 'app-reach',
  standalone: true,
  imports: [RevealOnScrollDirective],
  templateUrl: './reach.component.html',
})
export class ReachComponent implements OnInit {
  reach = reach;

  private seo = inject(SeoService);

  ngOnInit(): void {
    this.seo.set({
      title: 'Reach',
      description: reach.lede,
      path: '/reach/',
    });
  }
}
