import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ui-awaiting-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="awaiting-panel" [class.has-illustration]="!!illustration">
      <div *ngIf="illustration" class="awaiting-illustration-container">
        <img [src]="illustration" [alt]="illustrationAlt" class="awaiting-illustration-img" loading="lazy" />
      </div>
      <div class="awaiting-content">
        <h3>{{ heading }}</h3>
        <p>{{ message }}</p>
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [`
    .awaiting-panel.has-illustration {
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }
    @media (max-width: 640px) {
      .awaiting-panel.has-illustration {
        flex-direction: column;
        align-items: flex-start;
      }
    }
    .awaiting-illustration-container {
      width: 110px;
      height: 110px;
      flex-shrink: 0;
      border-radius: var(--r-md, 8px);
      overflow: hidden;
      background: var(--surface-2);
      border: 1px solid var(--rule);
    }
    .awaiting-illustration-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  `]
})
export class AwaitingPanelComponent {
  @Input() heading = 'Awaiting content';
  @Input() message = 'Nothing to show yet.';
  @Input() illustration?: string;
  @Input() illustrationAlt = '';
}

