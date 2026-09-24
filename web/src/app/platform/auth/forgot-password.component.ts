import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, toApiError } from '../core/api.service';
import { AuthCardComponent } from './auth-card.component';

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterLink, AuthCardComponent],
  template: `
    <app-auth-card heading="Reset your password">
      @if (sent()) {
        <!-- Same message whether or not the address has an account (no membership oracle). -->
        <div class="pf-alert pf-alert-ok" role="status">{{ sent() }}</div>
        <p class="pf-muted">
          The link expires in an hour. Check your spam folder if it does not arrive.
        </p>
      } @else {
        <p class="pf-muted">
          Enter the email address of your platform account and we'll send you a link.
        </p>
        @if (error()) {
          <div class="pf-alert pf-alert-error" role="alert">{{ error() }}</div>
        }
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <div class="pf-field">
            <label for="email">Email</label>
            <input
              id="email"
              class="pf-input"
              type="email"
              formControlName="email"
              autocomplete="email"
              required
            />
          </div>
          <button
            class="pf-btn pf-btn-primary"
            type="submit"
            [disabled]="busy()"
            style="width: 100%"
          >
            Send reset link
          </button>
        </form>
      }
      <div class="pf-auth-links"><a routerLink="/platform/login">Back to sign in</a></div>
    </app-auth-card>
  `,
})
export class ForgotPasswordComponent {
  private api = inject(ApiService);
  protected busy = signal(false);
  protected sent = signal('');
  protected error = signal('');
  protected form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.error.set('Enter a valid email address.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      await this.api.csrf();
      this.sent.set((await this.api.forgotPassword(this.form.getRawValue().email)).detail);
    } catch (e) {
      const err = toApiError(e);
      this.error.set(err.status === 429 ? 'Too many requests. Try again later.' : err.message);
    } finally {
      this.busy.set(false);
    }
  }
}
