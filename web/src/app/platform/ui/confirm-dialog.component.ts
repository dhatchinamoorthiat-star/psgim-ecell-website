import { Component, ElementRef, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';

/**
 * Confirmation for sensitive actions (brief §56). Uses the native <dialog>,
 * so focus trapping and Escape come from the browser. When `typeToConfirm`
 * is set, the user must type that exact text before the action unlocks.
 */
@Component({
  selector: 'app-confirm-dialog',
  imports: [FormsModule],
  template: `
    <dialog #dlg class="pf-dialog" aria-labelledby="pf-confirm-title">
      <h2 id="pf-confirm-title">{{ title() }}</h2>
      <p>{{ message() }}</p>
      @if (typeToConfirm()) {
        <div class="pf-field">
          <label for="pf-confirm-input"
            >Type <strong>{{ typeToConfirm() }}</strong> to confirm</label
          >
          <input
            id="pf-confirm-input"
            class="pf-input"
            [ngModel]="typed()"
            (ngModelChange)="typed.set($event)"
            autocomplete="off"
          />
        </div>
      }
      @if (withReason()) {
        <div class="pf-field">
          <label for="pf-confirm-reason">Reason (recorded in the audit log)</label>
          <input
            id="pf-confirm-reason"
            class="pf-input"
            [ngModel]="reason()"
            (ngModelChange)="reason.set($event)"
            maxlength="300"
          />
        </div>
      }
      <div class="pf-dialog-actions">
        <button type="button" class="pf-btn" (click)="dlg.close()">Cancel</button>
        <button
          type="button"
          class="pf-btn"
          [class.pf-btn-danger]="danger()"
          [class.pf-btn-primary]="!danger()"
          [disabled]="!!typeToConfirm() && typed() !== typeToConfirm()"
          (click)="accept()"
        >
          {{ confirmLabel() }}
        </button>
      </div>
    </dialog>
  `,
})
export class ConfirmDialogComponent {
  title = input('Are you sure?');
  message = input('');
  confirmLabel = input('Confirm');
  danger = input(true);
  typeToConfirm = input<string>('');
  withReason = input(false);
  confirmed = output<{ typed: string; reason: string }>();

  private dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');
  protected typed = signal('');
  protected reason = signal('');

  open(): void {
    this.typed.set('');
    this.reason.set('');
    this.dlg().nativeElement.showModal();
  }

  /**
   * Emits synchronously from the confirm button. Cancel, Escape and the
   * backdrop only close the dialog, so nothing else can trigger the action.
   * (Not driven by the dialog's async `close` event, which is not reliably
   * delivered in every embedding browser.)
   */
  protected accept(): void {
    if (this.typeToConfirm() && this.typed() !== this.typeToConfirm()) return;
    const result = { typed: this.typed(), reason: this.reason() };
    this.dlg().nativeElement.close();
    this.confirmed.emit(result);
  }
}
