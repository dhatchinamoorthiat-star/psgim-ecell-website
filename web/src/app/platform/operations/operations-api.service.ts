import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { toApiError } from '../core/api.service';

/**
 * Phase C event operations, participant and roster APIs
 * (backend: apps/events/views.py, apps/participants/views.py — all under
 * /api/v1/content). Authorization is always decided by the server.
 */

const BASE = '/api/v1/content';

export type RegistrationState =
  | 'not_configured'
  | 'upcoming'
  | 'open'
  | 'full'
  | 'waitlist'
  | 'closed'
  | 'cancelled'
  | 'unavailable';

export interface Availability {
  state: RegistrationState;
  opens_at: string | null;
  closes_at: string | null;
  students: boolean;
  external: boolean;
  spots_left: number | null;
}

export interface PassStatus {
  state: 'not_issued' | 'active' | 'revoked';
  issued_at?: string;
  revoked_at?: string;
  reason?: string;
}

export interface MyRegistration {
  id: string;
  event: {
    slug: string;
    title: string;
    starts_at: string | null;
    ends_at: string | null;
    venue: string;
    status: string;
    cancel_reason: string;
  };
  status: 'confirmed' | 'waitlisted' | 'cancelled' | 'event_cancelled';
  participant_type: 'student' | 'external';
  registered_at: string;
  can_cancel: boolean;
  checked_in: boolean;
  pass: PassStatus;
}

export interface MyEventStatus {
  event: {
    slug: string;
    title: string;
    starts_at: string | null;
    ends_at: string | null;
    venue: string;
  };
  availability: Availability;
  eligibility: { eligible: boolean; participant_type: string | null; reason: string };
  registration: MyRegistration | null;
}

export interface IssuedPass {
  token: string;
  code: string;
  registration: MyRegistration;
}

export interface Operations {
  slug: string;
  title: string;
  is_published: boolean;
  status: 'active' | 'cancelled';
  cancel_reason: string;
  registration_state: RegistrationState;
  registration_opens_at: string | null;
  registration_closes_at: string | null;
  capacity: number | null;
  waitlist_enabled: boolean;
  checkin_opens_at: string | null;
  checkin_closes_at: string | null;
  allow_students: boolean;
  student_programmes: string[];
  student_batches: string[];
  allow_external: boolean;
  external_mode: 'all' | 'allowlist';
  external_allowlist: ExternalSummary[];
  summary: AttendanceSummary;
  starts_at: string | null;
  ends_at: string | null;
  venue: string;
}

export interface AttendanceSummary {
  confirmed: number;
  waitlisted: number;
  cancelled: number;
  checked_in: number;
  capacity: number | null;
}

export interface ExternalSummary {
  id: string;
  name: string;
  email: string;
  institution: string;
}

export interface Participant {
  name: string;
  participant_type: 'student' | 'external';
  roll_number?: string;
  programme?: string;
  batch?: string;
  institution?: string;
}

export interface Attendee extends Participant {
  registration_id: string;
  status: string;
  registered_at: string;
  checked_in_at: string | null;
  checkin_id: string | null;
}

export type ScanOutcome =
  | 'checked_in'
  | 'already_checked_in'
  | 'invalid'
  | 'revoked'
  | 'wrong_event'
  | 'event_cancelled'
  | 'not_confirmed'
  | 'outside_window';

export interface ScanResult {
  outcome: ScanOutcome;
  participant?: Participant;
  checked_in_at?: string;
  checked_in_by?: string;
  checkin_id?: string;
  status?: string;
}

export interface ScannerInfo {
  slug: string;
  title: string;
  status: string;
  checkin_opens_at: string | null;
  checkin_closes_at: string | null;
  checkin_open: boolean;
  summary: AttendanceSummary;
  can_manual: boolean;
}

export interface OperatedEvent {
  slug: string;
  title: string;
  is_published: boolean;
  permissions: string[];
  starts_at: string | null;
  ends_at: string | null;
  venue: string;
}

export interface Volunteer {
  id: string;
  name: string;
  email: string;
  ends_at: string | null;
}

export interface Programme {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
  student_count: number;
}

export interface RosterRow {
  row: number;
  action: 'create' | 'link' | 'update' | 'unchanged' | 'conflict' | 'error';
  messages: string[];
  data: Record<string, string>;
}

export interface RosterBatch {
  id: string;
  kind: 'student' | 'external';
  status: 'validated' | 'applied' | 'discarded';
  filename: string;
  summary: Record<string, unknown> & {
    create?: number;
    link?: number;
    update?: number;
    unchanged?: number;
    conflict?: number;
    error?: number;
    total?: number;
    applied?: { created: number; linked: number; updated: number };
    /** Present only when an invitation run stopped part-way (the backend sets `incomplete`). */
    invited?: { sent: number; skipped: number; failed: number; incomplete?: boolean };
  };
  created_at: string;
  applied_at: string | null;
  invited_at: string | null;
  uploaded_by: string;
  plan?: RosterRow[];
}

/** Provided by the /platform route (platform.routes.ts), so it uses the platform's CSRF-configured HttpClient. */
@Injectable()
export class OperationsApiService {
  private http = inject(HttpClient);

  private async call<T>(req: Promise<T>): Promise<T> {
    try {
      return await req;
    } catch (e) {
      throw toApiError(e);
    }
  }
  private get = <T>(path: string, params: Record<string, string> = {}) =>
    this.call(firstValueFrom(this.http.get<T>(BASE + path, { params })));
  private post = <T>(path: string, body: unknown = {}) =>
    this.call(firstValueFrom(this.http.post<T>(BASE + path, body)));

  // participant
  myEvent = (slug: string) => this.get<MyEventStatus>(`/me/events/${slug}`);
  register = (slug: string) => this.post<MyRegistration>(`/me/events/${slug}/register`);
  myRegistrations = () => this.get<{ results: MyRegistration[] }>('/me/registrations');
  myRegistration = (id: string) => this.get<MyRegistration>(`/me/registrations/${id}`);
  cancelMine = (id: string) => this.post<MyRegistration>(`/me/registrations/${id}/cancel`);
  issuePass = (id: string, replace: boolean) =>
    this.post<IssuedPass>(`/me/registrations/${id}/pass`, { replace });

  // organiser
  operatedEvents = () => this.get<{ results: OperatedEvent[] }>('/operations/events');
  operations = (slug: string) => this.get<Operations>(`/events/${slug}/operations`);
  updateOperations = (slug: string, body: Partial<Record<keyof Operations, unknown>>) =>
    this.call(
      firstValueFrom(this.http.patch<Operations>(`${BASE}/events/${slug}/operations`, body)),
    );
  cancelEvent = (slug: string, reason: string) =>
    this.post<Operations>(`/events/${slug}/operations/cancel`, { reason });
  attendees = (slug: string) =>
    this.get<{
      event: { slug: string; title: string };
      summary: AttendanceSummary;
      results: Attendee[];
    }>(`/events/${slug}/attendees`);
  staffCancel = (slug: string, registrationId: string, reason: string) =>
    this.post(`/events/${slug}/registrations/${registrationId}/cancel`, { reason });
  async exportCsv(slug: string, includeEmail: boolean): Promise<Blob> {
    const params: Record<string, string> = includeEmail ? { include_email: '1' } : {};
    return this.call(
      firstValueFrom(
        this.http.get(`${BASE}/events/${slug}/attendance.csv`, { params, responseType: 'blob' }),
      ),
    );
  }
  operationsProgrammes = () =>
    this.get<{ results: Pick<Programme, 'id' | 'code' | 'name'>[] }>('/operations/programmes');
  externals = (q: string) =>
    this.get<{ results: ExternalSummary[] }>('/operations/externals', { q });

  // check-in
  scanner = (slug: string) => this.get<ScannerInfo>(`/events/${slug}/scanner`);
  checkIn = (slug: string, body: { token?: string; code?: string; idempotency_key: string }) =>
    this.post<ScanResult>(`/events/${slug}/check-ins`, body);
  manualCheckIn = (slug: string, registrationId: string, reason: string) =>
    this.post<ScanResult>(`/events/${slug}/check-ins/manual`, {
      registration_id: registrationId,
      reason,
    });
  voidCheckIn = (slug: string, checkinId: string, reason: string) =>
    this.post(`/events/${slug}/check-ins/${checkinId}/void`, { reason });

  // volunteers
  volunteers = (slug: string) => this.get<{ results: Volunteer[] }>(`/events/${slug}/volunteers`);
  addVolunteer = (slug: string, email: string, endsAt: string | null) =>
    this.post<Volunteer>(`/events/${slug}/volunteers`, { email, ends_at: endsAt });
  removeVolunteer = (slug: string, id: string) =>
    this.call(firstValueFrom(this.http.delete(`${BASE}/events/${slug}/volunteers/${id}`)));

  // participants admin
  programmes = () => this.get<{ results: Programme[] }>('/participants/programmes');
  createProgramme = (code: string, name: string) =>
    this.post<Programme>('/participants/programmes', { code, name });
  updateProgramme = (id: string, body: Partial<Programme>) =>
    this.call(
      firstValueFrom(this.http.patch<Programme>(`${BASE}/participants/programmes/${id}`, body)),
    );
  rosterBatches = () => this.get<{ results: RosterBatch[] }>('/participants/roster');
  rosterBatch = (id: string) => this.get<RosterBatch>(`/participants/roster/${id}`);
  uploadRoster(kind: 'student' | 'external', file: File): Promise<RosterBatch> {
    const form = new FormData();
    form.append('kind', kind);
    form.append('file', file);
    return this.post<RosterBatch>('/participants/roster', form);
  }
  applyRoster = (id: string) =>
    this.post<RosterBatch>(`/participants/roster/${id}/apply`, { confirm: true });
  discardRoster = (id: string) => this.post<RosterBatch>(`/participants/roster/${id}/discard`);
  inviteRoster = (id: string) =>
    this.post<RosterBatch>(`/participants/roster/${id}/invite`, { confirm: true });
}

/** Human labels shared by the participant and organiser screens. */
export const REGISTRATION_STATE_LABEL: Record<RegistrationState, string> = {
  not_configured: 'Registration has not opened for this event.',
  upcoming: 'Registration opens soon.',
  open: 'Registration is open.',
  full: 'This event is full.',
  waitlist: 'This event is full — you can join the waitlist.',
  closed: 'Registration has closed.',
  cancelled: 'This event has been cancelled.',
  unavailable: 'Registration is not available.',
};

export const REGISTRATION_STATUS_LABEL: Record<MyRegistration['status'], string> = {
  confirmed: 'Confirmed',
  waitlisted: 'On the waitlist',
  cancelled: 'Cancelled',
  event_cancelled: 'Event cancelled',
};

export function formatWhen(iso: string | null | undefined): string {
  if (!iso) return 'Date to be confirmed';
  return new Date(iso).toLocaleString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Unique per scan so a retried request is never counted twice (server idempotency). */
export function newIdempotencyKey(): string {
  return (
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}
