import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { roadmap, roadmapNote } from '../../core/data/roadmap.data';
import { SeoService } from '../../core/services/seo.service';
import { RevealOnScrollDirective } from '../../core/directives/reveal.directive';

@Component({
  selector: 'app-soon',
  standalone: true,
  imports: [CommonModule, RevealOnScrollDirective],
  templateUrl: './soon.component.html',
})
export class SoonComponent implements OnInit {
  roadmap = roadmap;
  roadmapNote = roadmapNote;

  private seo = inject(SeoService);

  ngOnInit(): void {
    this.seo.set({
      title: "What's coming",
      description: roadmapNote,
      path: '/soon/',
    });
  }
}
