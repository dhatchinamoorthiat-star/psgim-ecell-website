import { Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { toApiError } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { AuthCardComponent } from './auth-card.component';

/** Only in-platform paths are accepted as a post-login destination (no open redirect). */
export function safeReturnUrl(url: string | undefined | null): string {
  return url && url.startsWith('/platform/') && !url.startsWith('//') && !url.includes('://')
    ? url
    : '/platform/dashboard';
}

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, AuthCardComponent],
  template: `
    <app-auth-card heading="Member Sign In">
      <p class="pf-muted" style="margin-bottom: var(--s-3); font-size: 0.95rem; text-align: center;">
        Welcome back. Sign in with your E-Cell credentials.
      </p>
      @if (reason() === 'expired') {
        <div class="pf-alert" role="status">Your session ended. Please sign in again.</div>
      }
      @if (error()) {
        <div class="pf-alert pf-alert-error" role="alert">{{ error() }}</div>
      }
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <div class="pf-field">
          <label for="email">Email / Member ID</label>
          <input
            id="email"
            class="pf-input"
            type="email"
            formControlName="email"
            autocomplete="username"
            placeholder="member@psgim.ac.in"
            required
          />
        </div>
        <div class="pf-field">
          <label for="password">Password</label>
          <input
            id="password"
            class="pf-input"
            type="password"
            formControlName="password"
            autocomplete="current-password"
            required
          />
        </div>
        <button class="pf-btn pf-btn-primary" type="submit" [disabled]="busy()" style="width: 100%">
          {{ busy() ? 'Signing in…' : 'Sign In' }}
        </button>
      </form>
      <div class="pf-auth-links">
        <a routerLink="/platform/forgot-password">Forgot password?</a>
        <a routerLink="/">Back to the website</a>
      </div>
    </app-auth-card>
  `,
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  returnUrl = input<string>();
  reason = input<string>();

  protected busy = signal(false);
  protected error = signal('');
  protected form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.error.set('Enter your email and password.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      const { email, password } = this.form.getRawValue();
      await this.auth.login(email, password);
      await this.router.navigateByUrl(safeReturnUrl(this.returnUrl()));
    } catch (e) {
      const err = toApiError(e);
      this.error.set(
        err.status === 429 ? 'Too many attempts. Wait a minute and try again.' : err.message,
      );
      this.form.controls.password.reset();
    } finally {
      this.busy.set(false);
    }
  }
}
