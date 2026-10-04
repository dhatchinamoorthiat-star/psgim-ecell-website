import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { nec, toTrackRows, toIncentiveRows, toFaqRows, preliminaryTotals } from '../../core/data/nec.data';
import { site } from '../../core/data/site.data';
import { SeoService } from '../../core/services/seo.service';
import { RevealOnScrollDirective } from '../../core/motion/directives/reveal.directive';
import { StatTileComponent } from '../../shared/ui/stat-tile.component';
import { PendingFlagComponent } from '../../shared/ui/pending-flag.component';
import { QrGeneratorComponent } from '../../shared/ui/qr-generator.component';
import { ProgressBarComponent } from '../../shared/ui/progress-bar.component';
import { EditorialRowListComponent } from '../../shared/ui/editorial-row-list/editorial-row-list.component';
import { EditorialTimelineComponent } from '../../shared/ui/editorial-timeline/editorial-timeline.component';

@Component({
  selector: 'app-nec',
  standalone: true,
  imports: [
    CommonModule,
    RevealOnScrollDirective,
    StatTileComponent,
    PendingFlagComponent,
    QrGeneratorComponent,
    ProgressBarComponent,
    EditorialRowListComponent,
    EditorialTimelineComponent,
  ],
  templateUrl: './nec.component.html',
  styleUrl: './nec.component.css',
})
export class NecComponent implements OnInit {
  nec = nec;
  necPageUrl = `${site.url}/nec/`;
  trackRows = toTrackRows();
  incentiveRows = toIncentiveRows();
  faqRows = toFaqRows();
  totals = preliminaryTotals();

  private seo = inject(SeoService);

  ngOnInit(): void {
    this.seo.set({
      title: 'NEC 2026',
      description: nec.hero.lede,
      path: '/nec/',
    });
  }
}
