import { Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, toApiError } from '../core/api.service';
import { AuthCardComponent } from './auth-card.component';

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink, AuthCardComponent],
  template: `
    <app-auth-card heading="Choose a new password">
      @if (!uid() || !token()) {
        <div class="pf-alert pf-alert-error" role="alert">
          This link is incomplete. Request a new one.
        </div>
        <div class="pf-auth-links">
          <a routerLink="/platform/forgot-password">Request a new link</a>
        </div>
      } @else if (done()) {
        <div class="pf-alert pf-alert-ok" role="status">{{ done() }}</div>
        <p class="pf-muted">You have been signed out on every device.</p>
        <div class="pf-auth-links"><a routerLink="/platform/login">Sign in</a></div>
      } @else {
        @if (error()) {
          <div class="pf-alert pf-alert-error" role="alert">{{ error() }}</div>
        }
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <div class="pf-field">
            <label for="pw">New password</label>
            <input
              id="pw"
              class="pf-input"
              type="password"
              formControlName="password"
              autocomplete="new-password"
              [attr.aria-invalid]="fieldErrors().length > 0"
              aria-describedby="pw-help"
              required
            />
            <small id="pw-help">At least 10 characters. Avoid common passwords.</small>
            @for (msg of fieldErrors(); track msg) {
              <span class="pf-field-error">{{ msg }}</span>
            }
          </div>
          <div class="pf-field">
            <label for="pw2">Repeat it</label>
            <input
              id="pw2"
              class="pf-input"
              type="password"
              formControlName="confirm"
              autocomplete="new-password"
              required
            />
          </div>
          <button
            class="pf-btn pf-btn-primary"
            type="submit"
            [disabled]="busy()"
            style="width: 100%"
          >
            Set password
          </button>
        </form>
        <div class="pf-auth-links">
          <a routerLink="/platform/forgot-password">Request a new link</a>
        </div>
      }
    </app-auth-card>
  `,
})
export class ResetPasswordComponent {
  private api = inject(ApiService);
  uid = input<string>();
  token = input<string>();

  protected busy = signal(false);
  protected done = signal('');
  protected error = signal('');
  protected fieldErrors = signal<string[]>([]);
  protected form = inject(FormBuilder).nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(10)]],
    confirm: ['', Validators.required],
  });

  async submit(): Promise<void> {
    const { password, confirm } = this.form.getRawValue();
    this.fieldErrors.set([]);
    if (password.length < 10) {
      this.error.set('Use at least 10 characters.');
      return;
    }
    if (password !== confirm) {
      this.error.set('The two passwords do not match.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      await this.api.csrf();
      this.done.set((await this.api.resetPassword(this.uid()!, this.token()!, password)).detail);
    } catch (e) {
      const err = toApiError(e);
      this.error.set(err.message);
      this.fieldErrors.set(err.fields['new_password'] ?? []);
    } finally {
      this.busy.set(false);
    }
  }
}
