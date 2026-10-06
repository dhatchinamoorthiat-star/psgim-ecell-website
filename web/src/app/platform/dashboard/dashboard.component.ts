import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { visibleNav } from '../core/nav';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="pf-page-head">
      <div>
        <h1>Welcome back, {{ auth.user()?.full_name }}</h1>
        <p class="pf-muted">
          {{ auth.me()?.organization?.name }} · PSGIM E-Cell Member Platform
        </p>
      </div>
    </div>

    <!-- Quick Actions -->
    <section style="margin-top: 1.5rem;">
      <h2 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.75rem;">Quick Actions</h2>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;">
        <a routerLink="/platform/qr-generator" class="pf-card" style="text-decoration: none; color: inherit; transition: transform 0.15s ease;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="font-size: 1.5rem;">📱</div>
            <div>
              <div style="font-weight: 600; font-size: 0.95rem;">Generate QR</div>
              <div class="pf-muted" style="font-size: 0.8rem; margin-top: 0.2rem;">Create scannable E-Cell QR posters</div>
            </div>
          </div>
        </a>

        <a *ngIf="canEditPages()" routerLink="/platform/pages" class="pf-card" style="text-decoration: none; color: inherit; transition: transform 0.15s ease;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="font-size: 1.5rem;">📝</div>
            <div>
              <div style="font-weight: 600; font-size: 0.95rem;">Pages</div>
              <div class="pf-muted" style="font-size: 0.8rem; margin-top: 0.2rem;">Browse and edit site pages</div>
            </div>
          </div>
        </a>

        <a routerLink="/platform/approvals" class="pf-card" style="text-decoration: none; color: inherit; transition: transform 0.15s ease;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="font-size: 1.5rem;">✅</div>
            <div>
              <div style="font-weight: 600; font-size: 0.95rem;">Approvals</div>
              <div class="pf-muted" style="font-size: 0.8rem; margin-top: 0.2rem;">Content review and workflow inbox</div>
            </div>
          </div>
        </a>

        <a *ngIf="canAccessControl()" routerLink="/platform/control" class="pf-card" style="text-decoration: none; color: inherit; transition: transform 0.15s ease;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="font-size: 1.5rem;">⚙️</div>
            <div>
              <div style="font-weight: 600; font-size: 0.95rem;">Control Center</div>
              <div class="pf-muted" style="font-size: 0.8rem; margin-top: 0.2rem;">Internal operations & vertical management</div>
            </div>
          </div>
        </a>

        <a *ngIf="adminLinks().length" routerLink="/platform/admin/users" class="pf-card" style="text-decoration: none; color: inherit; transition: transform 0.15s ease;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="font-size: 1.5rem;">🛡️</div>
            <div>
              <div style="font-weight: 600; font-size: 0.95rem;">User & System Admin</div>
              <div class="pf-muted" style="font-size: 0.8rem; margin-top: 0.2rem;">Manage users, verticals & roles</div>
            </div>
          </div>
        </a>
      </div>
    </section>

    <div class="pf-grid" style="margin-top: 1.5rem;">
      <section class="pf-card">
        <h2>Your Access Overview</h2>
        @if (roleSummary().length === 0) {
          <p class="pf-muted">You don't hold any administrative roles yet. Standard member access is active.</p>
        } @else {
          <p class="pf-muted" style="margin-bottom: 0.75rem;">
            You hold {{ auth.grants().length }} permission grant(s) across
            {{ roleSummary().length }} scope(s).
          </p>
          <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
            @for (s of roleSummary(); track s) {
              <span class="pf-chip pf-chip-accent">{{ s }}</span>
            }
          </div>
        }
      </section>

      @if (adminLinks().length) {
        <section class="pf-card">
          <h2>Administration Shortcuts</h2>
          <ul style="margin: 0; padding-left: 1.1rem; line-height: 1.8;">
            @for (item of adminLinks(); track item.path) {
              <li>
                <a [routerLink]="item.path" style="color: var(--pf-accent); text-decoration: none; font-weight: 500;">{{ item.label }}</a>
              </li>
            }
          </ul>
        </section>
      }

      <section class="pf-card">
        <h2>Platform Operations</h2>
        <p class="pf-muted">
          All authenticated operations are governed by E-Cell backend role permissions. Use the sidebar menu to navigate.
        </p>
      </section>
    </div>
  `,
})
export class DashboardComponent {
  protected auth = inject(AuthService);

  protected roleSummary = computed(() => {
    const scopes = new Set(
      this.auth
        .grants()
        .map((g) =>
          g.scope_type === 'GLOBAL' ? 'Organisation-wide' : `${g.scope_type.toLowerCase()} scope`,
        ),
    );
    return [...scopes];
  });

  protected canEditPages = computed(() => this.auth.canAnywhere('content.view'));

  protected canAccessControl = computed(() => {
    return (
      this.auth.canAnywhere('user.view') ||
      this.auth.canAnywhere('vertical.view') ||
      this.auth.canAnywhere('role.view') ||
      this.auth.canAnywhere('content.view')
    );
  });

  protected adminLinks = computed(() => {
    this.auth.grants();
    return (
      visibleNav((p) => this.auth.canAnywhere(p)).find((s) => s.label === 'Administration')
        ?.items ?? []
    );
  });
}
