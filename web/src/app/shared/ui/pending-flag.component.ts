import { Component, Input } from '@angular/core';

@Component({
  selector: 'ui-pending-flag',
  standalone: true,
  template: `<span class="pending-flag">{{ label }}</span>`,
})
export class PendingFlagComponent {
  @Input() label = 'To be confirmed';
}
