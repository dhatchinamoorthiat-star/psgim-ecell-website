import { Routes } from '@angular/router';

export const BLOGS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./blogs.component').then((m) => m.BlogsComponent),
  },
  {
    path: ':slug',
    loadComponent: () => import('./blog-article/blog-article.component').then((m) => m.BlogArticleComponent),
  },
];
