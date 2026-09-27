import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { CsrfTokenExtractor } from './csrf-token.extractor';

describe('CsrfTokenExtractor', () => {
  function extractor(cookie: string) {
    TestBed.configureTestingModule({
      providers: [CsrfTokenExtractor, { provide: DOCUMENT, useValue: { cookie } }],
    });
    return TestBed.inject(CsrfTokenExtractor);
  }

  it("reads Django's csrftoken among other cookies", () => {
    expect(extractor('sb-auth=abc; csrftoken=tok123; theme=dark').getToken()).toBe('tok123');
  });

  it('does not match cookies that merely end with the name', () => {
    expect(extractor('xcsrftoken=nope').getToken()).toBeNull();
  });

  it('returns null when absent', () => {
    expect(extractor('').getToken()).toBeNull();
  });
});
