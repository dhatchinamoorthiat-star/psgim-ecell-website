import { DOCUMENT } from '@angular/common';
import {
  HttpClient,
  HttpXsrfTokenExtractor,
  provideHttpClient,
  withFetch,
  withXsrfConfiguration,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { appConfig } from './app.config';
import { CSRF_COOKIE, CsrfTokenExtractor } from './core/csrf-token.extractor';

/**
 * The public app POSTs the membership-interest form, so its root HttpClient
 * needs the same XSRF wiring /platform has (ADR-004). Without it Angular
 * sends no X-CSRFToken and Django's csrf_protect rejects the request.
 */
describe('public app CSRF configuration', () => {
  it('provides the Django cookie extractor at the root injector', () => {
    TestBed.configureTestingModule({ providers: [...appConfig.providers] });
    expect(TestBed.inject(HttpXsrfTokenExtractor)).toBeInstanceOf(CsrfTokenExtractor);
  });

  it('uses Django cookie and header names, not Angular defaults', () => {
    expect(CSRF_COOKIE).toBe('csrftoken');
  });

  describe('request behaviour', () => {
    let http: HttpClient;
    let ctrl: HttpTestingController;

    function configure(cookie: string) {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(
            withFetch(),
            withXsrfConfiguration({ cookieName: CSRF_COOKIE, headerName: 'X-CSRFToken' }),
          ),
          provideHttpClientTesting(),
          { provide: HttpXsrfTokenExtractor, useClass: CsrfTokenExtractor },
          { provide: DOCUMENT, useValue: { cookie } },
        ],
      });
      http = TestBed.inject(HttpClient);
      ctrl = TestBed.inject(HttpTestingController);
    }

    afterEach(() => ctrl.verify());

    it('sends X-CSRFToken on a browser POST', () => {
      configure('csrftoken=tok123');
      http.post('/api/v1/public/join', { name: 'A' }).subscribe();
      const req = ctrl.expectOne('/api/v1/public/join');
      expect(req.request.headers.get('X-CSRFToken')).toBe('tok123');
      req.flush({ status: 'accepted' });
    });

    it('leaves existing GET requests untouched', () => {
      configure('csrftoken=tok123');
      http.get('/api/v1/content/public/page/home').subscribe();
      const req = ctrl.expectOne('/api/v1/content/public/page/home');
      expect(req.request.headers.has('X-CSRFToken')).toBe(false);
      req.flush({});
    });

    it('sends no header when the cookie is absent, as during SSR', () => {
      // On the server there is no cookie jar: the extractor returns null and
      // Angular omits the header rather than throwing.
      configure('');
      http.post('/api/v1/public/join', {}).subscribe();
      const req = ctrl.expectOne('/api/v1/public/join');
      expect(req.request.headers.has('X-CSRFToken')).toBe(false);
      req.flush({});
    });

    it('does not attach the token to a cross-origin POST', () => {
      configure('csrftoken=tok123');
      http.post('https://elsewhere.example/collect', {}).subscribe();
      const req = ctrl.expectOne('https://elsewhere.example/collect');
      expect(req.request.headers.has('X-CSRFToken')).toBe(false);
      req.flush({});
    });
  });
});
