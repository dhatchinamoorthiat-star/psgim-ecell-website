import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../core/auth.service';
import { visibleNav } from '../core/nav';

@Component({
  selector: 'app-platform-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <a class="pf-sr-only" href="#pf-main">Skip to content</a>
    <div class="pf-shell">
      <header class="pf-topbar">
        <button
          type="button"
          class="pf-menu-toggle"
          [attr.aria-expanded]="menuOpen()"
          aria-controls="pf-sidebar"
          (click)="menuOpen.set(!menuOpen())"
        >
          <span class="pf-sr-only">Menu</span>
          <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
            <path
              d="M3 5h14M3 10h14M3 15h14"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
            />
          </svg>
        </button>
        <a class="pf-brand" routerLink="/platform/dashboard">
          <img src="/logo.png" alt="" />
          <span>PSGIM E-Cell <small>Platform</small></span>
        </a>
        <span class="pf-topbar-spacer"></span>
        <span class="pf-user">{{ auth.user()?.full_name }}</span>
        <button
          type="button"
          class="pf-btn pf-btn-sm"
          (click)="signOut()"
          [disabled]="signingOut()"
        >
          Sign out
        </button>
      </header>

      <nav class="pf-sidebar" id="pf-sidebar" [attr.data-open]="menuOpen()" aria-label="Platform">
        @for (section of nav(); track section.label) {
          <div class="pf-nav-section">
            <div class="pf-nav-label">{{ section.label }}</div>
            <div class="pf-nav">
              @for (item of section.items; track item.path) {
                <a
                  [routerLink]="item.path"
                  routerLinkActive="pf-active"
                  ariaCurrentWhenActive="page"
                  >{{ item.label }}</a
                >
              }
            </div>
          </div>
        }
        <div class="pf-nav-section">
          <div class="pf-nav">
            <a href="/">Public website</a>
          </div>
        </div>
      </nav>

      <main class="pf-main" id="pf-main" tabindex="-1">
        <router-outlet />
      </main>
    </div>
  `,
})
export class PlatformShellComponent {
  protected auth = inject(AuthService);
  private router = inject(Router);

  protected menuOpen = signal(false);
  protected signingOut = signal(false);
  protected nav = computed(() => {
    this.auth.grants(); // recompute when permissions change
    return visibleNav((p) => this.auth.canAnywhere(p));
  });

  constructor() {
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.menuOpen.set(false));
  }

  async signOut(): Promise<void> {
    this.signingOut.set(true);
    try {
      await this.auth.logout();
    } finally {
      this.signingOut.set(false);
      await this.router.navigate(['/']);
    }
  }
}
