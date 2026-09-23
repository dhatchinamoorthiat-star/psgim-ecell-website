import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { CountUpDirective } from '../../core/directives/count-up.directive';

@Component({
  selector: 'ui-stat-tile',
  standalone: true,
  imports: [CommonModule, CountUpDirective],
  template: `
    <div class="stat-tile">
      <span class="value">
        <ng-container *ngIf="count !== null; else plain">
          <span [countUp]="count" [countUpSuffix]="suffix">0</span>
        </ng-container>
        <ng-template #plain>{{ value }}</ng-template>
      </span>
      <span class="label">{{ label }}</span>
    </div>
  `,
})
export class StatTileComponent {
  @Input() value = '';
  @Input() label = '';
  @Input() count: number | null = null;
  @Input() suffix = '';
}
