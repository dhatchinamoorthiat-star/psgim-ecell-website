import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { toApiError } from '../core/api.service';

const BASE = '/api/v1/content/events';

/** The editor-writable structured fields (backend: apps.content.event_detail). */
export interface EventDetailFields {
  title: string;
  kind?: string;
  starts_at?: string | null;
  ends_at?: string | null;
  venue?: string;
  summary?: string;
  description?: string;
  time_label?: string;
  audience?: string;
  organizer?: string;
  registration_status?: string;
  registration_link?: string;
  turnout?: string;
  linkedin_url?: string;
  hashtags?: string[];
  speakers?: { name: string; designation?: string; org?: string }[];
  featured_image?: string;
  gallery?: { src: string; alt: string }[];
  related_initiative?: string;
}

/** Read-only provenance the server adds; never sent back. */
export interface StoredEventDetail extends EventDetailFields {
  pending?: boolean;
  source?: string;
}

export interface EventVersion {
  id: string;
  number: number;
  state: string;
  detail: StoredEventDetail;
  updated_at: string;
}

export interface AdminEvent {
  id: string;
  slug: string;
  state: string;
  owner_vertical: string | null;
  is_published: boolean;
  draft: EventVersion | null;
  published: EventVersion | null;
  created_at: string;
  updated_at: string;
}

const WRITABLE: (keyof EventDetailFields)[] = [
  'title',
  'kind',
  'starts_at',
  'ends_at',
  'venue',
  'summary',
  'description',
  'time_label',
  'audience',
  'organizer',
  'registration_status',
  'registration_link',
  'turnout',
  'linkedin_url',
  'hashtags',
  'speakers',
  'featured_image',
  'gallery',
  'related_initiative',
];

/** Only editor-writable keys — the server rejects provenance/unknown keys. */
export function writableDetail(detail: StoredEventDetail): EventDetailFields {
  const out: Record<string, unknown> = {};
  for (const key of WRITABLE) if (detail[key] !== undefined) out[key] = detail[key];
  return out as unknown as EventDetailFields;
}

/**
 * /api/v1/content/events (apps.content.event_views). Authorization is decided
 * by the server; scheduling is intentionally not offered (no executor yet).
 */
@Injectable()
export class EventsAdminApiService {
  private http = inject(HttpClient);

  private async call<T>(req: Promise<T>): Promise<T> {
    try {
      return await req;
    } catch (e) {
      throw toApiError(e);
    }
  }

  list = (q = '') =>
    this.call(
      firstValueFrom(this.http.get<{ results: AdminEvent[] }>(BASE, { params: q ? { q } : {} })),
    );
  get = (slug: string) => this.call(firstValueFrom(this.http.get<AdminEvent>(`${BASE}/${slug}`)));
  create = (slug: string, detail: EventDetailFields, ownerVerticalId: string | null) =>
    this.call(
      firstValueFrom(
        this.http.post<AdminEvent>(BASE, {
          slug,
          detail,
          ...(ownerVerticalId ? { owner_vertical_id: ownerVerticalId } : {}),
        }),
      ),
    );
  update = (slug: string, detail: EventDetailFields, expectedUpdatedAt: string | null) =>
    this.call(
      firstValueFrom(
        this.http.patch<AdminEvent>(`${BASE}/${slug}`, {
          detail,
          expected_updated_at: expectedUpdatedAt,
        }),
      ),
    );
  submit = (slug: string) =>
    this.call(firstValueFrom(this.http.post<AdminEvent>(`${BASE}/${slug}/submit`, {})));
  publish = (slug: string) =>
    this.call(firstValueFrom(this.http.post<AdminEvent>(`${BASE}/${slug}/publish`, {})));
  unpublish = (slug: string) =>
    this.call(firstValueFrom(this.http.post<AdminEvent>(`${BASE}/${slug}/unpublish`, {})));
  archive = (slug: string) =>
    this.call(firstValueFrom(this.http.delete<AdminEvent>(`${BASE}/${slug}`)));
}

/** Human status for an event row/header. */
export function statusLabel(ev: AdminEvent): string {
  if (ev.state === 'ARCHIVED' && !ev.is_published && !ev.draft) return 'Archived';
  const draft = ev.draft?.state;
  const pending =
    draft === 'SUBMITTED' || draft === 'IN_REVIEW'
      ? 'in review'
      : draft === 'APPROVED'
        ? 'approved, ready to publish'
        : draft === 'CHANGES_REQUESTED'
          ? 'changes requested'
          : draft === 'DRAFT'
            ? 'draft'
            : '';
  if (ev.is_published) return pending ? `Live · new version ${pending}` : 'Live';
  if (ev.state === 'ARCHIVED') return 'Archived';
  return pending ? pending.charAt(0).toUpperCase() + pending.slice(1) : 'Not published';
}
