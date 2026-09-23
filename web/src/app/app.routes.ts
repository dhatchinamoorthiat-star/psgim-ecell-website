import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/home/home.component').then((m) => m.HomeComponent) },
  { path: 'about', loadComponent: () => import('./features/about/about.component').then((m) => m.AboutComponent) },
  {
    path: 'initiatives',
    loadComponent: () => import('./features/initiatives/initiatives.component').then((m) => m.InitiativesComponent),
  },
  { path: 'events', loadComponent: () => import('./features/events/events.component').then((m) => m.EventsComponent) },
  { path: 'team', loadComponent: () => import('./features/team/team.component').then((m) => m.TeamComponent) },
  { path: 'gallery', loadComponent: () => import('./features/gallery/gallery.component').then((m) => m.GalleryComponent) },
  { path: 'nec', loadComponent: () => import('./features/nec/nec.component').then((m) => m.NecComponent) },
  { path: 'contact', loadComponent: () => import('./features/contact/contact.component').then((m) => m.ContactComponent) },
  { path: 'soon', loadComponent: () => import('./features/soon/soon.component').then((m) => m.SoonComponent) },
  { path: 'control', loadComponent: () => import('./features/control/control.component').then((m) => m.ControlComponent) },
  { path: '**', redirectTo: '' },
];
