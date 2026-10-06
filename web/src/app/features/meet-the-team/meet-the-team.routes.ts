import { Routes } from '@angular/router';

/**
 * `/meet-the-team` is the canonical team page. Two kinds of legacy URL are
 * redirected rather than removed, so links that already exist externally keep
 * landing somewhere sensible instead of 404ing:
 *
 *  - `/meet-the-team/president` and `/vice-president` were hardcoded
 *    duplicates of `member/:slug`, giving each leader two URLs. Both pointed
 *    at invented people and are gone.
 *  - `member/:slug` is reserved, not shipped. Every person on the roll is a
 *    name without a recorded bio, skill or contribution, so a member page
 *    could only ever show a name and a role — the "glorified profile card"
 *    this redesign exists to avoid. It redirects to the team page, where all
 *    those people are actually represented. Restore it as a real route when
 *    there is real per-person content to put on it.
 */
export const MEET_THE_TEAM_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./meet-the-team.component').then((m) => m.MeetTheTeamComponent),
  },
  {
    path: 'vertical/:slug',
    loadComponent: () => import('./vertical-detail/vertical-detail.component').then((m) => m.VerticalDetailComponent),
  },
  { path: 'president', redirectTo: '', pathMatch: 'full' },
  { path: 'vice-president', redirectTo: '', pathMatch: 'full' },
  { path: 'member/:slug', redirectTo: '', pathMatch: 'full' },
  { path: 'member', redirectTo: '', pathMatch: 'full' },
];
