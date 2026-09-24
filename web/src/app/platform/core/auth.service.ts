import { Injectable, computed, inject, signal } from '@angular/core';
import { ApiError, ApiService } from './api.service';
import { Grant, Me } from './api.types';

export type AuthState = 'unknown' | 'anonymous' | 'authenticated';

/**
 * The platform's view of "who is signed in and what may they do".
 *
 * Permissions here come from /auth/me and are used ONLY to decide what to
 * show. Every request is re-authorized by the Django policy engine; hiding a
 * button is never security.
 */
@Injectable()
export class AuthService {
  private api = inject(ApiService);

  private readonly _me = signal<Me | null>(null);
  private readonly _state = signal<AuthState>('unknown');
  private loading: Promise<void> | null = null;

  readonly me = this._me.asReadonly();
  readonly state = this._state.asReadonly();
  readonly user = computed(() => this._me()?.user ?? null);
  readonly grants = computed<Grant[]>(() => this._me()?.permissions ?? []);

  /** Bootstraps the CSRF cookie and the session, once. Safe to call from every guard. */
  ensureLoaded(): Promise<void> {
    if (this._state() !== 'unknown') return Promise.resolve();
    this.loading ??= this.refresh();
    return this.loading;
  }

  async refresh(): Promise<void> {
    try {
      await this.api.csrf();
      this.setMe(await this.api.me());
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) this.clear();
      else {
        this.loading = null; // network trouble: let the next navigation retry
        throw e;
      }
    }
  }

  async login(email: string, password: string): Promise<void> {
    await this.api.csrf();
    this.setMe(await this.api.login(email, password));
  }

  async logout(): Promise<void> {
    try {
      await this.api.logout();
    } finally {
      this.clear();
      await this.api.csrf().catch(() => undefined); // fresh token for the next sign-in
    }
  }

  /** Called when the server says the session is gone (expired, deactivated, signed out elsewhere). */
  markExpired(): void {
    this.clear();
  }

  private setMe(me: Me): void {
    this._me.set(me);
    this._state.set('authenticated');
  }

  private clear(): void {
    this._me.set(null);
    this._state.set('anonymous');
  }

  /** Holds `perm` organisation-wide (GLOBAL, not own-only). */
  canGlobal(perm: string): boolean {
    return this.grants().some(
      (g) => g.permission === perm && g.scope_type === 'GLOBAL' && !g.own_only,
    );
  }

  /** Holds `perm` in at least one scope — enough to show a screen whose data the server will scope. */
  canAnywhere(perm: string): boolean {
    return this.grants().some((g) => g.permission === perm && !g.own_only);
  }

  /** Holds `perm` globally or in the given scope. */
  canIn(perm: string, scopeType: string, scopeId: string): boolean {
    return this.grants().some(
      (g) =>
        g.permission === perm &&
        !g.own_only &&
        (g.scope_type === 'GLOBAL' || (g.scope_type === scopeType && g.scope_id === scopeId)),
    );
  }
}
