import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** The frame shared by the sign-in, forgot and reset screens. */
@Component({
  selector: 'app-auth-card',
  imports: [RouterLink],
  template: `
    <main class="pf-auth">
      <div class="pf-auth-card pf-card">
        <a class="pf-brand" routerLink="/"
          ><img src="/logo.png" alt="" /><span>PSGIM E-Cell <small>Platform</small></span></a
        >
        <h1>{{ heading() }}</h1>
        <ng-content />
      </div>
    </main>
  `,
})
export class AuthCardComponent {
  heading = input.required<string>();
}
