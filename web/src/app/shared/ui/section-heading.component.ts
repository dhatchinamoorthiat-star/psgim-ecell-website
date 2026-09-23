import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'ui-section-heading',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="section-heading">
      <span class="kicker" *ngIf="kicker">{{ kicker }}</span>
      <h2>{{ heading }}</h2>
    </div>
  `,
})
export class SectionHeadingComponent {
  @Input() kicker = '';
  @Input() heading = '';
}
