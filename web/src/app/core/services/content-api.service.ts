import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  DynamicQueryResponse,
  EventQueryResult,
  PublicContentResponse,
} from '../../shared/blocks/block.types';

const BASE = '/api/v1/content/public';

/**
 * Upper bound on a dynamic-query request. Without it a hung API leaves a
 * section in its loading state indefinitely; with it the caller reaches its
 * error state (and offers Retry) instead.
 */
export const DYNAMIC_QUERY_TIMEOUT_MS = 15_000;

/**
 * The only place the Angular app calls the CMS public read API
 * (`PublicContentDetailView` / `PublicDynamicQueryView`,
 * backend/apps/content/views.py). Unauthenticated, GET-only, published
 * content only — matches the same relative `/api/...` + `proxy.conf.json`
 * convention as the platform's `ApiService` (web/src/app/platform/core).
 */
@Injectable({ providedIn: 'root' })
export class ContentApiService {
  private http = inject(HttpClient);

  getPage(contentType: string, slug: string): Promise<PublicContentResponse> {
    return firstValueFrom(this.http.get<PublicContentResponse>(`${BASE}/${contentType}/${slug}`));
  }

  /**
   * One published event (`PublicEventDetailView`). Drafts, unpublished,
   * archived and unknown slugs all answer 404 — callers show "not found".
   */
  getEvent(slug: string): Promise<EventQueryResult> {
    return firstValueFrom(
      this.http.get<EventQueryResult>(`${BASE}/events/${encodeURIComponent(slug)}`, {
        timeout: DYNAMIC_QUERY_TIMEOUT_MS,
      }),
    );
  }

  getDynamic<T = Record<string, unknown>>(
    queryId: string,
    opts: { sort?: string; limit?: number } = {},
  ): Promise<DynamicQueryResponse<T>> {
    const params: Record<string, string> = {};
    if (opts.sort) params['sort'] = opts.sort;
    if (opts.limit) params['limit'] = String(opts.limit);
    return firstValueFrom(
      this.http.get<DynamicQueryResponse<T>>(`${BASE}/dynamic/${queryId}`, {
        params,
        timeout: DYNAMIC_QUERY_TIMEOUT_MS,
      }),
    );
  }
}
