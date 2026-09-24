import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { inauguration } from '../../core/data/inauguration.data';
import { SeoService } from '../../core/services/seo.service';
import { RevealOnScrollDirective } from '../../core/directives/reveal.directive';
import { PendingFlagComponent } from '../../shared/ui/pending-flag.component';

@Component({
  selector: 'app-inauguration',
  standalone: true,
  imports: [CommonModule, RouterLink, RevealOnScrollDirective, PendingFlagComponent],
  templateUrl: './inauguration.component.html',
})
export class InaugurationComponent implements OnInit {
  inauguration = inauguration;

  private seo = inject(SeoService);

  ngOnInit(): void {
    this.seo.set({
      title: 'Grand Inauguration',
      description: this.inauguration.hero.lede,
      path: '/inauguration/',
    });
  }
}
