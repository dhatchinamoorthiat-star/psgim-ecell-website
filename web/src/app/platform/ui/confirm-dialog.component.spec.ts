import { TestBed } from '@angular/core/testing';
import { ConfirmDialogComponent } from './confirm-dialog.component';

describe('ConfirmDialogComponent', () => {
  beforeAll(() => {
    // jsdom lacks <dialog> behaviour; the component only needs these two calls.
    HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    };
  });

  function create(typeToConfirm = '') {
    const fixture = TestBed.createComponent(ConfirmDialogComponent);
    fixture.componentRef.setInput('typeToConfirm', typeToConfirm);
    fixture.componentRef.setInput('withReason', true);
    const emitted: { typed: string; reason: string }[] = [];
    fixture.componentInstance.confirmed.subscribe((v) => emitted.push(v));
    fixture.detectChanges();
    return { fixture, emitted, el: fixture.nativeElement as HTMLElement };
  }

  const confirmButton = (el: HTMLElement) =>
    [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Confirm')!;

  it('requires the exact text before it will confirm', async () => {
    const { fixture, emitted, el } = create('demo-c');
    fixture.componentInstance.open();
    fixture.detectChanges();
    expect(confirmButton(el).disabled).toBe(true);

    const input = el.querySelector<HTMLInputElement>('#pf-confirm-input')!;
    input.value = 'demo-c';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(confirmButton(el).disabled).toBe(false);

    confirmButton(el).click();
    expect(emitted).toEqual([{ typed: 'demo-c', reason: '' }]);
  });

  it('cancelling emits nothing', () => {
    const { fixture, emitted, el } = create();
    fixture.componentInstance.open();
    fixture.detectChanges();
    [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Cancel')!.click();
    expect(emitted).toEqual([]);
  });

  it('re-opening clears the previous confirmation text', async () => {
    const { fixture, el } = create('demo-c');
    fixture.componentInstance.open();
    const input = el.querySelector<HTMLInputElement>('#pf-confirm-input')!;
    input.value = 'demo-c';
    input.dispatchEvent(new Event('input'));
    confirmButton(el).click();
    fixture.componentInstance.open();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(confirmButton(el).disabled).toBe(true);
  });
});
