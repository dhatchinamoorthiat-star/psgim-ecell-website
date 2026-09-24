import { Component, OnInit, inject } from '@angular/core';
import { NgIf } from '@angular/common';
import { vision } from '../../core/data/about.data';
import { SeoService } from '../../core/services/seo.service';
import { RevealOnScrollDirective } from '../../core/directives/reveal.directive';
import { PendingFlagComponent } from '../../shared/ui/pending-flag.component';

@Component({
  selector: 'app-vision-mission',
  standalone: true,
  imports: [NgIf, RevealOnScrollDirective, PendingFlagComponent],
  templateUrl: './vision-mission.component.html',
})
export class VisionMissionComponent implements OnInit {
  vision = vision;

  private seo = inject(SeoService);

  ngOnInit(): void {
    this.seo.set({
      title: 'Vision & Mission',
      description: vision.statement,
      path: '/vision-mission/',
    });
  }
}
