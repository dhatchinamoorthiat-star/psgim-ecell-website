import { Component, Input } from '@angular/core';

@Component({
  selector: 'ui-progress-bar',
  standalone: true,
  template: `<div class="progress-bar"><div class="fill" [style.width.%]="pct"></div></div>`,
})
export class ProgressBarComponent {
  @Input() now = 0;
  @Input() target = 1;

  get pct(): number {
    if (!this.target) return 0;
    return Math.min(100, Math.round((this.now / this.target) * 100));
  }
}
