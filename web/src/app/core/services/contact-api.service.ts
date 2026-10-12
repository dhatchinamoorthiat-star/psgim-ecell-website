import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

const BASE = '/api/v1';

export class ContactApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fields: Record<string, string[]> = {},
  ) {
    super(message);
  }
}

export interface ContactQueryInput {
  name: string;
  email: string;
  subject?: string;
  message: string;
  /** Hidden honeypot field — always empty for a real visitor. */
  website?: string;
  elapsed_ms?: number;
}

/**
 * The only place the Angular app calls the public contact-form endpoint
 * (`ContactSubmitView`, backend/apps/contact/views.py). Unauthenticated,
 * same `/api/...` + proxy convention as ContentApiService.
 */
@Injectable({ providedIn: 'root' })
export class ContactApiService {
  private http = inject(HttpClient);

  async submit(input: ContactQueryInput): Promise<void> {
    // `csrf_protect` only accepts the POST once the `csrftoken` cookie
    // exists — on a visitor's first page load it does not, so this primes
    // it (same pattern the backend's own tests use: apps/join/tests).
    await firstValueFrom(this.http.get<{ csrf_token: string }>(`${BASE}/auth/csrf`));
    try {
      await firstValueFrom(this.http.post<{ status: string }>(`${BASE}/public/contact`, input));
    } catch (e) {
      if (e instanceof HttpErrorResponse) {
        const body = e.error as { error?: { message: string; fields?: Record<string, string[]> } } | null;
        if (body?.error) throw new ContactApiError(e.status, body.error.message, body.error.fields ?? {});
        if (e.status === 0) throw new ContactApiError(0, 'Cannot reach the server. Check your connection.');
      }
      throw new ContactApiError(0, 'Something went wrong. Please try again.');
    }
  }
}
