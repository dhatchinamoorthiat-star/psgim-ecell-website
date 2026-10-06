import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-platform-control',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="pf-page-head">
      <div>
        <h1>Control Center</h1>
        <p class="pf-muted">
          Internal operations and administration hub for PSGIM E-Cell.
        </p>
      </div>
    </div>

    <div class="pf-grid" style="margin-top: 1.5rem;">
      <!-- Administration Section -->
      <section class="pf-card" *ngIf="canAdmin()">
        <h2>Platform Administration</h2>
        <p class="pf-muted">Manage system users, verticals, roles, and security assignments.</p>
        <div class="pf-nav" style="margin-top: 1rem; display: flex; flex-direction: column; gap: 0.5rem;">
          <a *ngIf="auth.canAnywhere('user.view')" routerLink="/platform/admin/users" class="pf-btn pf-btn-sm pf-btn-wrap">
            👥 User Management & Member Invitations
          </a>
          <a *ngIf="auth.canAnywhere('vertical.view')" routerLink="/platform/admin/verticals" class="pf-btn pf-btn-sm pf-btn-wrap">
            🏢 Verticals & Team Structure
          </a>
          <a *ngIf="auth.canAnywhere('role.view')" routerLink="/platform/admin/roles" class="pf-btn pf-btn-sm pf-btn-wrap">
            🛡️ System Roles & Permissions
          </a>
          <a *ngIf="auth.canAnywhere('role.view')" routerLink="/platform/admin/assignments" class="pf-btn pf-btn-sm pf-btn-wrap">
            📋 Role Assignments & Scopes
          </a>
        </div>
      </section>

      <!-- Content & Operations Section -->
      <section class="pf-card">
        <h2>Content & Operations</h2>
        <p class="pf-muted">Manage member workflows, review submissions, and asset generation.</p>
        <div class="pf-nav" style="margin-top: 1rem; display: flex; flex-direction: column; gap: 0.5rem;">
          <a routerLink="/platform/approvals" class="pf-btn pf-btn-sm pf-btn-wrap">
            ✅ Content Approvals Inbox
          </a>
          <a routerLink="/platform/qr-generator" class="pf-btn pf-btn-sm pf-btn-wrap">
            📱 Scannable QR Poster Generator
          </a>
        </div>
      </section>

      <!-- Platform Status -->
      <section class="pf-card">
        <h2>Member Scope & Status</h2>
        <p class="pf-muted">Your active account parameters and organization information.</p>
        <div style="margin-top: 1rem; font-size: 0.9rem; line-height: 1.6;">
          <div><strong>Signed in as:</strong> {{ auth.user()?.full_name }} ({{ auth.user()?.email }})</div>
          <div><strong>Status:</strong> <span class="pf-chip pf-chip-accent">{{ auth.user()?.status }}</span></div>
          <div><strong>Active Grants:</strong> {{ auth.grants().length }} permission grant(s)</div>
        </div>
      </section>
    </div>
  `,
})
export class PlatformControlComponent {
  protected auth = inject(AuthService);

  protected canAdmin = computed(() => {
    return (
      this.auth.canAnywhere('user.view') ||
      this.auth.canAnywhere('vertical.view') ||
      this.auth.canAnywhere('role.view')
    );
  });
}
