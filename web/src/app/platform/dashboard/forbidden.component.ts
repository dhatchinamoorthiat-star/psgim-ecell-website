import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-forbidden',
  imports: [RouterLink],
  template: `
    <div class="pf-card" role="alert">
      <h2>You don't have access to this page</h2>
      <p class="pf-muted">
        Your roles don't include it. If you think they should, ask an administrator.
      </p>
      <a class="pf-btn" routerLink="/platform/dashboard">Back to dashboard</a>
    </div>
  `,
})
export class ForbiddenComponent {}
