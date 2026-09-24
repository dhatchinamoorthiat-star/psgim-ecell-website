import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { visibleNav } from '../core/nav';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  template: `
    <div class="pf-page-head">
      <div>
        <h1>Welcome, {{ auth.user()?.full_name }}</h1>
        <p>
          {{ auth.me()?.organization?.name }} · times shown in
          {{ auth.me()?.organization?.timezone }}
        </p>
      </div>
    </div>

    <div class="pf-grid">
      <section class="pf-card">
        <h2>Your access</h2>
        @if (roleSummary().length === 0) {
          <p class="pf-muted">You don't hold any roles yet. An administrator assigns them.</p>
        } @else {
          <p class="pf-muted">
            You hold {{ auth.grants().length }} permission grants across
            {{ roleSummary().length }} scope(s).
          </p>
          @for (s of roleSummary(); track s) {
            <span class="pf-chip pf-chip-accent">{{ s }}</span>
          }
        }
      </section>

      @if (adminLinks().length) {
        <section class="pf-card">
          <h2>Administration</h2>
          <ul style="margin: 0; padding-left: 1.1rem">
            @for (item of adminLinks(); track item.path) {
              <li>
                <a [routerLink]="item.path">{{ item.label }}</a>
              </li>
            }
          </ul>
        </section>
      }

      <section class="pf-card">
        <h2>Coming in later phases</h2>
        <p class="pf-muted">
          Events, content publishing, tasks, requests and the knowledge base arrive in Phases 2–4.
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

  protected adminLinks = computed(() => {
    this.auth.grants();
    return (
      visibleNav((p) => this.auth.canAnywhere(p)).find((s) => s.label === 'Administration')
        ?.items ?? []
    );
  });
}
