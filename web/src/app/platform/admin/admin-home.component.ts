import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { visibleNav } from '../core/nav';

@Component({
  selector: 'app-admin-home',
  imports: [RouterLink],
  template: `
    <div class="pf-page-head">
      <div>
        <h1>Administration</h1>
        <p>People, verticals and who may do what.</p>
      </div>
    </div>
    <div class="pf-grid">
      @for (item of items(); track item.path) {
        <a class="pf-card" [routerLink]="item.path" style="text-decoration: none; color: inherit">
          <h2>{{ item.label }}</h2>
          <p class="pf-muted">{{ blurbs[item.label] }}</p>
        </a>
      }
    </div>
  `,
})
export class AdminHomeComponent {
  private auth = inject(AuthService);
  protected blurbs: Record<string, string> = {
    Users: 'Accounts: create, invite, deactivate.',
    Verticals: 'The E-Cell’s teams, as data.',
    Roles: 'What each role is allowed to do.',
    Assignments: 'Who holds which role, where.',
  };
  protected items = computed(() => {
    this.auth.grants();
    return (
      visibleNav((p) => this.auth.canAnywhere(p)).find((s) => s.label === 'Administration')
        ?.items ?? []
    );
  });
}
