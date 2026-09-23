import { Component, Input } from '@angular/core';

@Component({
  selector: 'ui-awaiting-panel',
  standalone: true,
  template: `
    <div class="awaiting-panel">
      <h3>{{ heading }}</h3>
      <p>{{ message }}</p>
      <ng-content></ng-content>
    </div>
  `,
})
export class AwaitingPanelComponent {
  @Input() heading = 'Awaiting content';
  @Input() message = 'Nothing to show yet.';
}
