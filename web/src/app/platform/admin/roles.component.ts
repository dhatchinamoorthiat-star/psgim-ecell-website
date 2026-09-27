import { Component, OnInit, inject, signal } from '@angular/core';
import { ApiService, toApiError } from '../core/api.service';
import { Role } from '../core/api.types';

/** Read-only in Phase 1: system roles are defined in code (apps/rbac/catalogue.py) and seeded. */
@Component({
  selector: 'app-roles',
  template: `
    <div class="pf-page-head">
      <div>
        <h1>Roles</h1>
        <p>A role is a bundle of permissions. Where it applies is set when it is assigned.</p>
      </div>
    </div>
    @if (error()) {
      <div class="pf-alert pf-alert-error" role="alert">{{ error() }}</div>
    }
    @for (r of roles(); track r.id) {
      <section class="pf-card">
        <h2>
          {{ r.name }} <code class="pf-muted">{{ r.key }}</code>
          @if (r.is_privileged) {
            <span class="pf-chip pf-chip-warn">privileged</span>
          }
          @if (r.is_system) {
            <span class="pf-chip">system</span>
          }
        </h2>
        <p class="pf-muted">{{ r.description }}</p>
        <p class="pf-muted">
          Assigning it requires <code>{{ r.assign_permission }}</code
          >{{ r.is_privileged ? ' and Super Admin authority' : '' }}.
        </p>
        <div>
          @for (p of r.permissions; track p.code) {
            <span class="pf-chip" [title]="p.own_only ? 'Only over items they own' : ''"
              >{{ p.code }}{{ p.own_only ? ' (own)' : '' }}</span
            >
          }
        </div>
      </section>
    }
  `,
})
export class RolesComponent implements OnInit {
  private api = inject(ApiService);
  protected roles = signal<Role[]>([]);
  protected error = signal('');

  async ngOnInit(): Promise<void> {
    try {
      this.roles.set(await this.api.roles());
    } catch (e) {
      this.error.set(toApiError(e).message);
    }
  }
}
