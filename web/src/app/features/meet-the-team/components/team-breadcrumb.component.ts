import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-team-breadcrumb',
  imports: [RouterLink],
  template: `
    <nav class="team-breadcrumb" aria-label="Breadcrumb">
      <ol class="breadcrumb-list">
        <li class="breadcrumb-item">
          <a routerLink="/">Home</a>
        </li>
        <li class="breadcrumb-separator" aria-hidden="true">/</li>
        <li class="breadcrumb-item">
          <a routerLink="/meet-the-team" [class.active]="!current">Meet the Team</a>
        </li>
        @if (vertical) {
          <li class="breadcrumb-separator" aria-hidden="true">/</li>
          <li class="breadcrumb-item">
            <a [routerLink]="['/meet-the-team/vertical', vertical.slug]" [class.active]="!current">
              {{ vertical.name }}
            </a>
          </li>
        }
        @if (current) {
          <li class="breadcrumb-separator" aria-hidden="true">/</li>
          <li class="breadcrumb-item active" aria-current="page">
            {{ current }}
          </li>
        }
      </ol>
    </nav>
  `,
  styles: [`
    .team-breadcrumb {
      margin-bottom: var(--s-5, 1.5rem);
      font-size: var(--t-sm, 0.9375rem);
    }
    .breadcrumb-list {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--s-2, 0.5rem);
      list-style: none;
      padding: 0;
      margin: 0;
      color: var(--ink-3, #6c7e97);
    }
    .breadcrumb-item a {
      color: var(--ink-2, #41546f);
      text-decoration: none;
      transition: color var(--dur-fast);
    }
    .breadcrumb-item a:hover {
      color: var(--accent-ink, #8a5c00);
    }
    .breadcrumb-item.active {
      color: var(--ink, #0a1b33);
      font-weight: 700;
    }
    .breadcrumb-separator {
      color: var(--rule, #d9e4f1);
      user-select: none;
    }
  `],
})
export class TeamBreadcrumbComponent {
  @Input() vertical?: { name: string; slug: string };
  @Input() current?: string;
}
