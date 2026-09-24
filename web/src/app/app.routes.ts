import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/home/home.component').then((m) => m.HomeComponent) },
  { path: 'about', loadComponent: () => import('./features/about/about.component').then((m) => m.AboutComponent) },
  { path: 'origin', loadComponent: () => import('./features/origin/origin.component').then((m) => m.OriginComponent) },
  {
    path: 'vision-mission',
    loadComponent: () => import('./features/vision-mission/vision-mission.component').then((m) => m.VisionMissionComponent),
  },
  { path: 'reach', loadComponent: () => import('./features/reach/reach.component').then((m) => m.ReachComponent) },
  {
    path: 'spotlight',
    loadComponent: () => import('./features/spotlight/spotlight.component').then((m) => m.SpotlightComponent),
  },
  { path: 'history', loadComponent: () => import('./features/history/history.component').then((m) => m.HistoryComponent) },
  {
    path: 'initiatives',
    loadComponent: () => import('./features/initiatives/initiatives.component').then((m) => m.InitiativesComponent),
  },
  { path: 'podcast', loadComponent: () => import('./features/podcast/podcast.component').then((m) => m.PodcastComponent) },
  {
    path: 'website-av',
    loadComponent: () => import('./features/website-av/website-av.component').then((m) => m.WebsiteAvComponent),
  },
  { path: 'events', loadComponent: () => import('./features/events/events.component').then((m) => m.EventsComponent) },
  { path: 'team', loadComponent: () => import('./features/team/team.component').then((m) => m.TeamComponent) },
  { path: 'gallery', loadComponent: () => import('./features/gallery/gallery.component').then((m) => m.GalleryComponent) },
  { path: 'nec', loadComponent: () => import('./features/nec/nec.component').then((m) => m.NecComponent) },
  {
    path: 'inauguration',
    loadComponent: () => import('./features/inauguration/inauguration.component').then((m) => m.InaugurationComponent),
  },
  { path: 'contact', loadComponent: () => import('./features/contact/contact.component').then((m) => m.ContactComponent) },
  { path: 'soon', loadComponent: () => import('./features/soon/soon.component').then((m) => m.SoonComponent) },
  { path: 'control', loadComponent: () => import('./features/control/control.component').then((m) => m.ControlComponent) },
  { path: '**', redirectTo: '' },
];
