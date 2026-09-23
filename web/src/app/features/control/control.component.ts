import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SeoService } from '../../core/services/seo.service';
import { QrGeneratorComponent } from '../../shared/ui/qr-generator.component';

@Component({
  selector: 'app-control',
  standalone: true,
  imports: [CommonModule, QrGeneratorComponent],
  templateUrl: './control.component.html',
})
export class ControlComponent implements OnInit {
  prefill = '';

  private seo = inject(SeoService);
  private route = inject(ActivatedRoute);

  ngOnInit(): void {
    this.seo.set({
      title: 'QR Poster Generator',
      description: 'Internal QR-poster generator for PSGIM E-Cell.',
      path: '/control/',
      robots: 'noindex, nofollow',
    });
    this.prefill = this.route.snapshot.queryParamMap.get('q') ?? '';
  }
}
