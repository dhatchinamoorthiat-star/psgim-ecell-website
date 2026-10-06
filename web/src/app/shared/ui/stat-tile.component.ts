import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CountUpDirective } from '../../core/directives/count-up.directive';
import { InlineTextComponent } from './inline-text.component';

/**
 * `value`/`count`/`suffix` stay read-only here even in the editor: `count`
 * drives an animated count-up display, not a plain string, so authoring it
 * is the side panel's job (a number input), not click-and-type text.
 * `label` is a plain string with no derived display, so it's safe to make
 * inline-editable — `editable`/`labelChange` are opt-in and default off,
 * so the two other call sites of this component (home/NEC's own static
 * stat rows, which never pass them) are unaffected.
 */
@Component({
  selector: 'ui-stat-tile',
  standalone: true,
  imports: [CommonModule, CountUpDirective, InlineTextComponent],
  template: `
    <div class="stat-tile">
      <span class="value">
        <ng-container *ngIf="count !== null; else plain">
          <span [countUp]="count" [countUpSuffix]="suffix">0</span>
        </ng-container>
        <ng-template #plain>{{ value }}</ng-template>
      </span>
      <ui-inline-text
        tag="span"
        className="label"
        [value]="label"
        [editable]="editable"
        [singleLine]="true"
        (valueChange)="labelChange.emit($event)"
      />
    </div>
  `,
})
export class StatTileComponent {
  @Input() value = '';
  @Input() label = '';
  @Input() count: number | null = null;
  @Input() suffix = '';
  @Input() editable = false;
  @Output() labelChange = new EventEmitter<string>();
}
