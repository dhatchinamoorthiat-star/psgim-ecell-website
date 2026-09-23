import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { nec } from '../../core/data/nec.data';
import { site } from '../../core/data/site.data';
import { SeoService } from '../../core/services/seo.service';
import { RevealOnScrollDirective } from '../../core/directives/reveal.directive';
import { StatTileComponent } from '../../shared/ui/stat-tile.component';
import { PendingFlagComponent } from '../../shared/ui/pending-flag.component';
import { QrGeneratorComponent } from '../../shared/ui/qr-generator.component';

@Component({
  selector: 'app-nec',
  standalone: true,
  imports: [CommonModule, RevealOnScrollDirective, StatTileComponent, PendingFlagComponent, QrGeneratorComponent],
  templateUrl: './nec.component.html',
})
export class NecComponent implements OnInit {
  nec = nec;
  necPageUrl = `${site.url}/nec/`;

  private seo = inject(SeoService);

  ngOnInit(): void {
    this.seo.set({
      title: 'NEC 2026',
      description: nec.hero.lede,
      path: '/nec/',
    });
  }
}
