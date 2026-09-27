import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { sessionExpiryInterceptor } from './session-expiry.interceptor';

describe('sessionExpiryInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let expired: number;
  let navigations: unknown[][];

  beforeEach(() => {
    expired = 0;
    navigations = [];
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([sessionExpiryInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { markExpired: () => expired++ } },
        {
          provide: Router,
          useValue: {
            url: '/platform/admin/users',
            navigate: (...args: unknown[]) => navigations.push(args),
          },
        },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  async function fail(url: string, status: number): Promise<void> {
    const request = firstValueFrom(http.get(url));
    backend
      .expectOne(url)
      .flush({ error: { code: 'x', message: 'x' } }, { status, statusText: 'x' });
    await expect(request).rejects.toBeTruthy(); // the error still reaches the caller
  }

  it('treats a 401 from an ordinary endpoint as an ended session', async () => {
    await fail('/api/v1/users', 401);
    expect(expired).toBe(1);
    expect(navigations).toEqual([
      [
        ['/platform/login'],
        { queryParams: { returnUrl: '/platform/admin/users', reason: 'expired' } },
      ],
    ]);
  });

  it('ignores 401 from the endpoints that are expected to return it', async () => {
    for (const url of ['/api/v1/auth/me', '/api/v1/auth/login', '/api/v1/auth/csrf'])
      await fail(url, 401);
    expect(expired).toBe(0);
    expect(navigations).toEqual([]);
  });

  it('does not treat 403 (signed in, not allowed) as expiry', async () => {
    await fail('/api/v1/audit', 403);
    expect(expired).toBe(0);
    expect(navigations).toEqual([]);
  });
});
