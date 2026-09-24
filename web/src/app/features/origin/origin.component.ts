import { Component, OnInit, inject } from '@angular/core';
import { story } from '../../core/data/about.data';
import { SeoService } from '../../core/services/seo.service';
import { RevealOnScrollDirective } from '../../core/directives/reveal.directive';

@Component({
  selector: 'app-origin',
  standalone: true,
  imports: [RevealOnScrollDirective],
  templateUrl: './origin.component.html',
})
export class OriginComponent implements OnInit {
  story = story;

  private seo = inject(SeoService);

  ngOnInit(): void {
    this.seo.set({
      title: 'Origin',
      description: story.paragraphs[0],
      path: '/origin/',
    });
  }
}
