import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { QrGeneratorComponent, QrPreset } from '../../shared/ui/qr-generator.component';
import { site } from '../../core/data/site.data';

@Component({
  selector: 'app-platform-qr-generator',
  standalone: true,
  imports: [CommonModule, QrGeneratorComponent],
  template: `
    <div class="pf-page-head">
      <div>
        <h1>QR Generator</h1>
        <p class="pf-muted">
          Generate scannable QR codes with the official E-Cell mark for events, posters, and member tools.
        </p>
      </div>
    </div>

    <div class="pf-card" style="margin-top: 1.5rem;">
      <ui-qr-generator [prefill]="prefill" [presets]="presets" [advanced]="true"></ui-qr-generator>
    </div>
  `,
})
export class PlatformQrGeneratorComponent implements OnInit {
  prefill = '';

  readonly presets: QrPreset[] = [
    { label: 'Website Home', value: site.url + '/' },
    { label: 'Events Page', value: site.url + '/events/' },
    { label: 'NEC 2026', value: site.url + '/nec/' },
    { label: 'Member Portal', value: site.url + '/platform/loginpage' },
  ];

  private route = inject(ActivatedRoute);

  ngOnInit(): void {
    this.prefill = this.route.snapshot.queryParamMap.get('q') ?? '';
  }
}
