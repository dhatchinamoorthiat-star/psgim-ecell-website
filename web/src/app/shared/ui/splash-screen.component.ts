import { Component, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const SEEN_KEY = 'ecell-splash-seen';
const HOLD_MS = 900;
const FADE_MS = 500;

/**
 * Full-screen brand splash shown once per browser session, ahead of the
 * router outlet. Rendered visible in the static/prerendered HTML too (so
 * there's no server/client hydration mismatch to fight) — a visitor without
 * JS simply keeps seeing the brand mark instead of it fading away, which is
 * a reasonable fallback, not a bug.
 */
@Component({
  selector: 'ui-splash-screen',
  standalone: true,
  template: `
    @if (!gone()) {
      <div class="splash" [class.is-leaving]="leaving()" aria-hidden="true">
        <div class="splash-stars"></div>
        <img src="/logo-lockup.png" alt="" class="splash-logo" />
      </div>
    }
  `,
})
export class SplashScreenComponent implements OnInit {
  private platformId = inject(PLATFORM_ID);
  readonly leaving = signal(false);
  readonly gone = signal(false);

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    if (sessionStorage.getItem(SEEN_KEY)) {
      this.gone.set(true);
      return;
    }
    sessionStorage.setItem(SEEN_KEY, '1');

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      this.gone.set(true);
      return;
    }

    setTimeout(() => {
      this.leaving.set(true);
      setTimeout(() => this.gone.set(true), FADE_MS);
    }, HOLD_MS);
  }
}
