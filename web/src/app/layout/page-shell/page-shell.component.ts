import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar.component';
import { FooterComponent } from '../footer/footer.component';
import { FloatingSocialDockComponent } from '../floating-social-dock/floating-social-dock.component';
import { site } from '../../core/data/site.data';

@Component({
  selector: 'app-page-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent, FooterComponent, FloatingSocialDockComponent],
  template: `
    <div class="notice-bar" *ngIf="site.notice.show">{{ site.notice.text }}</div>
    <app-navbar></app-navbar>
    <main>
      <router-outlet></router-outlet>
    </main>
    <app-footer></app-footer>
    <app-floating-social-dock></app-floating-social-dock>
  `,
})
export class PageShellComponent {
  site = site;
}
