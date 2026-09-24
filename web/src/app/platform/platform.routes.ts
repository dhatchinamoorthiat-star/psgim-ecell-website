import {
  HttpXsrfTokenExtractor,
  provideHttpClient,
  withFetch,
  withInterceptors,
  withXsrfConfiguration,
} from '@angular/common/http';
import { Routes } from '@angular/router';
import { ApiService } from './core/api.service';
import { AuthService } from './core/auth.service';
import { CSRF_COOKIE, CsrfTokenExtractor } from './core/csrf-token.extractor';
import { anonymousOnlyGuard, authGuard, permissionGuard } from './core/guards';
import { sessionExpiryInterceptor } from './core/session-expiry.interceptor';
import { PlatformRootComponent } from './platform-root.component';
import { PlatformShellComponent } from './shell/platform-shell.component';

/**
 * /platform — the authenticated member platform (docs/13_FRONTEND_ARCHITECTURE.md).
 *
 * Everything here is lazy-loaded and client-rendered (app.routes.server.ts).
 * Guards decide what to *show*; the Django API decides what is *allowed*.
 */
export const platformRoutes: Routes = [
  {
    path: '',
    component: PlatformRootComponent,
    providers: [
      // Same-origin API (ADR-004): Angular echoes Django's csrftoken cookie as X-CSRFToken.
      provideHttpClient(
        withFetch(),
        withXsrfConfiguration({ cookieName: CSRF_COOKIE, headerName: 'X-CSRFToken' }),
        withInterceptors([sessionExpiryInterceptor]),
      ),
      { provide: HttpXsrfTokenExtractor, useClass: CsrfTokenExtractor },
      ApiService,
      AuthService,
    ],
    children: [
      {
        path: 'login',
        canActivate: [anonymousOnlyGuard],
        title: 'Sign in — PSGIM E-Cell Platform',
        loadComponent: () => import('./auth/login.component').then((m) => m.LoginComponent),
      },
      {
        path: 'forgot-password',
        title: 'Forgot password — PSGIM E-Cell Platform',
        loadComponent: () =>
          import('./auth/forgot-password.component').then((m) => m.ForgotPasswordComponent),
      },
      {
        path: 'reset-password',
        title: 'Choose a password — PSGIM E-Cell Platform',
        loadComponent: () =>
          import('./auth/reset-password.component').then((m) => m.ResetPasswordComponent),
      },
      {
        path: '',
        component: PlatformShellComponent,
        canActivate: [authGuard],
        canActivateChild: [authGuard],
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
          {
            path: 'dashboard',
            title: 'Dashboard — PSGIM E-Cell Platform',
            loadComponent: () =>
              import('./dashboard/dashboard.component').then((m) => m.DashboardComponent),
          },
          {
            path: 'forbidden',
            title: 'Not available — PSGIM E-Cell Platform',
            loadComponent: () =>
              import('./dashboard/forbidden.component').then((m) => m.ForbiddenComponent),
          },
          {
            path: 'admin',
            children: [
              {
                path: '',
                canActivate: [permissionGuard('user.view', 'vertical.view', 'role.view')],
                title: 'Administration — PSGIM E-Cell Platform',
                loadComponent: () =>
                  import('./admin/admin-home.component').then((m) => m.AdminHomeComponent),
              },
              {
                path: 'users',
                canActivate: [permissionGuard('user.view')],
                title: 'Users — PSGIM E-Cell Platform',
                loadComponent: () =>
                  import('./admin/users.component').then((m) => m.UsersComponent),
              },
              {
                path: 'verticals',
                canActivate: [permissionGuard('vertical.view')],
                title: 'Verticals — PSGIM E-Cell Platform',
                loadComponent: () =>
                  import('./admin/verticals.component').then((m) => m.VerticalsComponent),
              },
              {
                path: 'roles',
                canActivate: [permissionGuard('role.view')],
                title: 'Roles — PSGIM E-Cell Platform',
                loadComponent: () =>
                  import('./admin/roles.component').then((m) => m.RolesComponent),
              },
              {
                path: 'assignments',
                canActivate: [permissionGuard('role.view')],
                title: 'Assignments — PSGIM E-Cell Platform',
                loadComponent: () =>
                  import('./admin/assignments.component').then((m) => m.AssignmentsComponent),
              },
            ],
          },
          { path: '**', redirectTo: 'dashboard' },
        ],
      },
    ],
  },
];
