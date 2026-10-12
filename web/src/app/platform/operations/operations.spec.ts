import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { ApiError } from '../core/api.service';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { ParticipantsAdminComponent } from '../admin/participants.component';
import { AuthService } from '../core/auth.service';
import { EventAttendeesComponent } from './event-attendees.component';
import { EventOperationsComponent } from './event-operations.component';
import { EventScannerComponent } from './event-scanner.component';
import { Attendee, OperationsApiService, RosterBatch } from './operations-api.service';

async function settle(fixture: { detectChanges(): void; whenStable(): Promise<unknown> }) {
  for (let i = 0; i < 3; i++) {
    await new Promise((r) => setTimeout(r));
    fixture.detectChanges();
    await fixture.whenStable();
  }
  fixture.detectChanges();
}

function setup(
  component: unknown,
  api: Partial<OperationsApiService>,
  perms: string[] = [],
  params = new BehaviorSubject(convertToParamMap({ slug: 'demo-day' })),
) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: OperationsApiService, useValue: api },
      { provide: AuthService, useValue: { canAnywhere: (p: string) => perms.includes(p) } },
      {
        provide: ActivatedRoute,
        useValue: {
          paramMap: params,
          get snapshot() {
            return { paramMap: params.value };
          },
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(component as never);
  fixture.detectChanges();
  return {
    fixture,
    el: fixture.nativeElement as HTMLElement,
    cmp: fixture.componentInstance as any,
  };
}

const button = (el: HTMLElement, text: string) =>
  Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.trim().startsWith(text)) as
    HTMLButtonElement | undefined;

const summary = { confirmed: 2, waitlisted: 1, cancelled: 0, checked_in: 1, capacity: 10 };
const attendee = (over: Partial<Attendee> = {}): Attendee => ({
  registration_id: 'r1',
  name: 'Asha',
  participant_type: 'student',
  roll_number: 'R1',
  programme: 'MBA',
  batch: '2025-27',
  status: 'confirmed',
  registered_at: '2099-04-01T10:00:00Z',
  checked_in_at: null,
  checkin_id: null,
  ...over,
});

describe('Scanner', () => {
  const info = {
    slug: 'demo-day',
    title: 'Demo Day',
    status: 'active',
    checkin_opens_at: null,
    checkin_closes_at: null,
    checkin_open: true,
    summary,
    can_manual: false,
  };

  it('checks in by typed code and shows the participant for an ID comparison', async () => {
    const api = {
      scanner: vi.fn().mockResolvedValue(info),
      checkIn: vi.fn().mockResolvedValue({
        outcome: 'checked_in',
        participant: {
          name: 'Asha',
          participant_type: 'student',
          roll_number: 'R1',
          programme: 'MBA',
          batch: '2025-27',
        },
        checked_in_at: '2099-05-01T10:00:00Z',
        checked_in_by: 'Volunteer',
      }),
    };
    const { fixture, el, cmp } = setup(EventScannerComponent, api);
    await settle(fixture);
    cmp.code = 'abcde-fghjk';
    await cmp.submitCode();
    await settle(fixture);
    const call = api.checkIn.mock.calls[0] as [string, { code: string; idempotency_key: string }];
    expect(call[0]).toBe('demo-day');
    expect(call[1].code).toBe('abcde-fghjk');
    expect(call[1].idempotency_key).toBeTruthy();
    expect(el.textContent).toContain('Checked in');
    expect(el.textContent).toContain('Asha');
    expect(el.textContent).toContain('Compare with their college or photo ID');
  });

  it('explains repeat scans and rejections clearly', async () => {
    const api = {
      scanner: vi.fn().mockResolvedValue(info),
      checkIn: vi
        .fn()
        .mockResolvedValueOnce({
          outcome: 'already_checked_in',
          participant: { name: 'Asha', participant_type: 'student' },
          checked_in_at: '2099-05-01T10:00:00Z',
          checked_in_by: 'Ravi',
        })
        .mockResolvedValueOnce({ outcome: 'wrong_event' }),
    };
    const { fixture, el, cmp } = setup(EventScannerComponent, api);
    await settle(fixture);
    cmp.code = 'ABCDE-FGHJK';
    await cmp.submitCode();
    await settle(fixture);
    expect(el.textContent).toContain('Already checked in');
    expect(el.textContent).toContain('by Ravi');
    button(el, 'Scan next')!.click();
    cmp.code = 'ZZZZZ-ZZZZZ';
    await cmp.submitCode();
    await settle(fixture);
    expect(el.textContent).toContain('This pass is for a different event');
    expect(el.textContent).not.toContain('Asha');
  });

  it('falls back to code entry when the browser cannot read QR codes', async () => {
    const { fixture, el } = setup(EventScannerComponent, {
      scanner: vi.fn().mockResolvedValue({ ...info, checkin_open: false }),
    });
    await settle(fixture);
    expect(el.textContent).toContain("can't read QR codes from the camera");
    expect(el.textContent).toContain('Check-in is not open now');
    expect(el.querySelector('#sc-code')).toBeTruthy();
  });
});

describe('Scanner — per-event access', () => {
  const info = (slug: string) => ({
    slug,
    title: slug === 'event-a' ? 'Event A' : 'Event B',
    status: 'active',
    checkin_opens_at: null,
    checkin_closes_at: null,
    checkin_open: true,
    summary,
    can_manual: false,
  });
  const notFound = () => new ApiError(404, 'not_found', 'Not found.');
  const forbidden = () => new ApiError(403, 'permission_denied', 'You do not have permission.');
  const at = (slug: string) => new BehaviorSubject(convertToParamMap({ slug }));
  const hasForm = (el: HTMLElement) => !!el.querySelector('#sc-code');

  it('shows a neutral loading state and no form until access is resolved', async () => {
    const { fixture, el } = setup(EventScannerComponent, {
      scanner: vi.fn().mockReturnValue(new Promise(() => undefined)),
    });
    await settle(fixture);
    expect(el.textContent).toContain('Checking your access to this event');
    expect(hasForm(el)).toBe(false);
  });

  it("a volunteer for Event A opening Event B's scanner sees an unavailable state, not the form", async () => {
    const api = {
      scanner: vi.fn((slug: string) =>
        slug === 'event-a' ? Promise.resolve(info('event-a')) : Promise.reject(notFound()),
      ),
      checkIn: vi.fn(),
    };
    const { fixture, el } = setup(EventScannerComponent, api, ['event.checkin'], at('event-b'));
    await settle(fixture);
    expect(el.textContent).toContain('Scanner not available');
    expect(el.querySelector('[role=alert]')).toBeTruthy();
    expect(hasForm(el)).toBe(false);
    expect(el.textContent).not.toContain('checked in of');
    expect(el.textContent).not.toContain('Not found.');
    expect(api.checkIn).not.toHaveBeenCalled();
  });

  it('403 and 404 produce the same message (no hint that the event exists)', async () => {
    const texts: string[] = [];
    for (const err of [notFound(), forbidden()]) {
      TestBed.resetTestingModule();
      const { fixture, el } = setup(
        EventScannerComponent,
        { scanner: vi.fn().mockRejectedValue(err) },
        [],
        at('event-b'),
      );
      await settle(fixture);
      texts.push(el.textContent ?? '');
    }
    expect(texts[0]).toBe(texts[1]);
  });

  it('navigating A -> B -> A resets state and never shows A data under B', async () => {
    const api = {
      scanner: vi.fn((slug: string) =>
        slug === 'event-a' ? Promise.resolve(info('event-a')) : Promise.reject(notFound()),
      ),
      checkIn: vi.fn().mockResolvedValue({
        outcome: 'checked_in',
        participant: {
          name: 'Asha',
          participant_type: 'student',
          roll_number: 'R1',
          programme: 'MBA',
          batch: '2025-27',
        },
        checked_in_at: '2099-05-01T10:00:00Z',
        checked_in_by: 'Volunteer',
      }),
    };
    const params = at('event-a');
    const { fixture, el, cmp } = setup(EventScannerComponent, api, ['event.checkin'], params);
    await settle(fixture);
    expect(hasForm(el)).toBe(true);
    expect(el.textContent).toContain('Event A');
    cmp.code = 'ABCDE-FGHJK';
    await cmp.submitCode();
    await settle(fixture);
    expect(el.textContent).toContain('Asha');
    cmp.code = 'typed-but-not-sent';

    params.next(convertToParamMap({ slug: 'event-b' }));
    await settle(fixture);
    expect(el.textContent).toContain('Scanner not available');
    expect(el.textContent).not.toContain('Asha');
    expect(el.textContent).not.toContain('Event A');
    expect(hasForm(el)).toBe(false);
    expect(cmp.code).toBe('');
    await cmp.submitCode();
    expect(api.checkIn).toHaveBeenCalledTimes(1);

    params.next(convertToParamMap({ slug: 'event-a' }));
    await settle(fixture);
    expect(hasForm(el)).toBe(true);
    expect(el.textContent).toContain('Event A');
    expect(el.textContent).not.toContain('Asha');
  });

  it('a request failure is reported with Retry, separately from denial', async () => {
    const scanner = vi
      .fn()
      .mockRejectedValueOnce(new ApiError(500, 'server_error', 'Something went wrong.'))
      .mockResolvedValueOnce(info('event-a'));
    const { fixture, el } = setup(EventScannerComponent, { scanner }, [], at('event-a'));
    await settle(fixture);
    expect(el.textContent).toContain('Something went wrong.');
    expect(el.textContent).not.toContain('Scanner not available');
    expect(hasForm(el)).toBe(false);
    button(el, 'Retry')!.click();
    await settle(fixture);
    expect(hasForm(el)).toBe(true);
  });

  it('losing access mid-shift (assignment removed) switches to the unavailable state', async () => {
    const api = {
      scanner: vi.fn().mockResolvedValue(info('event-a')),
      checkIn: vi.fn().mockRejectedValue(forbidden()),
    };
    const { fixture, el, cmp } = setup(
      EventScannerComponent,
      api,
      ['event.checkin'],
      at('event-a'),
    );
    await settle(fixture);
    cmp.code = 'ABCDE-FGHJK';
    await cmp.submitCode();
    await settle(fixture);
    expect(el.textContent).toContain('Scanner not available');
    expect(hasForm(el)).toBe(false);
  });
});

describe('Attendees', () => {
  it('lists attendees and requires a reason for staff actions', async () => {
    const api = {
      attendees: vi.fn().mockResolvedValue({
        event: { slug: 'demo-day', title: 'Demo Day' },
        summary,
        results: [attendee()],
      }),
      manualCheckIn: vi.fn().mockResolvedValue({ outcome: 'checked_in' }),
    };
    const { fixture, el, cmp } = setup(EventAttendeesComponent, api, [
      'event.operations.manage',
      'event.registration.view',
    ]);
    await settle(fixture);
    expect(el.textContent).toContain('Asha');
    expect(el.textContent).not.toContain('@');
    button(el, 'Manual check-in')!.click();
    fixture.detectChanges();
    expect(button(el, 'Confirm')!.disabled).toBe(true);
    cmp.reason = 'Phone dead; ID checked';
    fixture.detectChanges();
    await cmp.confirmPending();
    expect(api.manualCheckIn).toHaveBeenCalledWith('demo-day', 'r1', 'Phone dead; ID checked');
  });

  it('hides actions the user does not hold (the server still enforces them)', async () => {
    const api = {
      attendees: vi.fn().mockResolvedValue({
        event: { slug: 'demo-day', title: 'Demo Day' },
        summary,
        results: [attendee()],
      }),
    };
    const { fixture, el } = setup(EventAttendeesComponent, api, ['event.registration.view']);
    await settle(fixture);
    expect(button(el, 'Manual check-in')).toBeUndefined();
    expect(button(el, 'Cancel')).toBeUndefined();
    expect(button(el, 'Export CSV')).toBeUndefined();
  });

  it('exports CSV for exporters', async () => {
    const api = {
      attendees: vi.fn().mockResolvedValue({
        event: { slug: 'demo-day', title: 'Demo Day' },
        summary,
        results: [],
      }),
      exportCsv: vi.fn().mockResolvedValue(new Blob(['name\n'])),
    };
    const { fixture, el, cmp } = setup(EventAttendeesComponent, api, [
      'event.attendance.export',
      'event.registration.view',
    ]);
    (URL as any).createObjectURL ??= () => 'blob:x';
    (URL as any).revokeObjectURL ??= () => undefined;
    await settle(fixture);
    expect(el.textContent).toContain('No registrations yet');
    await cmp.exportCsv(false);
    expect(api.exportCsv).toHaveBeenCalledWith('demo-day', false);
  });
});

describe('Registration settings', () => {
  it('saves window, capacity and per-audience eligibility as one request', async () => {
    const ops = {
      slug: 'demo-day',
      title: 'Demo Day',
      is_published: true,
      status: 'active',
      cancel_reason: '',
      registration_state: 'not_configured',
      registration_opens_at: null,
      registration_closes_at: null,
      capacity: null,
      waitlist_enabled: false,
      checkin_opens_at: null,
      checkin_closes_at: null,
      allow_students: false,
      student_programmes: [],
      student_batches: [],
      allow_external: false,
      external_mode: 'all',
      external_allowlist: [],
      summary,
      starts_at: null,
      ends_at: null,
      venue: '',
    };
    const api = {
      operations: vi.fn().mockResolvedValue(ops),
      operationsProgrammes: vi
        .fn()
        .mockResolvedValue({ results: [{ id: 'p1', code: 'MBA', name: 'MBA' }] }),
      updateOperations: vi.fn().mockResolvedValue(ops),
    };
    const { fixture, cmp } = setup(EventOperationsComponent, api);
    await settle(fixture);
    cmp.f.registration_opens_at = '2099-04-01T09:00';
    cmp.f.registration_closes_at = '2099-04-30T17:00';
    cmp.f.capacity = 50;
    cmp.f.allow_students = true;
    cmp.toggleProgramme('p1');
    cmp.f.batches = '2025-27, 2024-26';
    await cmp.save();
    const body = (api.updateOperations.mock.calls[0] as [string, Record<string, unknown>])[1];
    expect(body['capacity']).toBe(50);
    expect(body['allow_students']).toBe(true);
    expect(body['student_programmes']).toEqual(['p1']);
    expect(body['student_batches']).toEqual(['2025-27', '2024-26']);
    expect(String(body['registration_opens_at'])).toMatch(/^2099-04-01T/);
  });
});

describe('Participants (roster)', () => {
  it('shows the dry-run report and applies only after confirmation; invitations are separate', async () => {
    const validated = {
      id: 'b1',
      kind: 'student',
      status: 'validated',
      filename: 'roster.csv',
      created_at: '',
      applied_at: null,
      invited_at: null,
      uploaded_by: 'a@x',
      summary: { create: 1, link: 0, update: 0, unchanged: 0, conflict: 1, error: 0, total: 2 },
      plan: [
        {
          row: 2,
          action: 'create',
          messages: ['New account'],
          data: { full_name: 'Asha', email: 'asha@x.test' },
        },
        {
          row: 3,
          action: 'conflict',
          messages: ['This roll number already belongs to a different account.'],
          data: { full_name: 'B', email: 'b@x.test' },
        },
      ],
    };
    const applied = {
      ...validated,
      status: 'applied',
      plan: undefined,
      summary: { ...validated.summary, applied: { created: 1, linked: 0, updated: 0 } },
    };
    const api = {
      programmes: vi.fn().mockResolvedValue({ results: [] }),
      rosterBatches: vi.fn().mockResolvedValue({ results: [] }),
      uploadRoster: vi.fn().mockResolvedValue(validated),
      applyRoster: vi.fn().mockResolvedValue(applied),
      inviteRoster: vi.fn().mockResolvedValue({
        ...applied,
        invited_at: 'now',
        summary: { ...applied.summary, invited: { sent: 1, skipped: 0, failed: 0 } },
      }),
    };
    const { fixture, el, cmp } = setup(ParticipantsAdminComponent, api);
    await settle(fixture);
    cmp.file = new File(['x'], 'roster.csv');
    await cmp.validate();
    await settle(fixture);
    expect(el.textContent).toContain('Dry-run report');
    expect(el.textContent).toContain('This roll number already belongs to a different account.');
    expect(api.applyRoster).not.toHaveBeenCalled();
    const confirmSpy = vi
      .spyOn(window, 'confirm')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    await cmp.apply();
    expect(api.applyRoster).not.toHaveBeenCalled();
    await cmp.apply();
    expect(api.applyRoster).toHaveBeenCalledWith('b1');
    await settle(fixture);
    expect(api.inviteRoster).not.toHaveBeenCalled();
    button(el, 'Send invitations')!.click();
    fixture.detectChanges();
    await cmp.invite();
    expect(api.inviteRoster).toHaveBeenCalledWith('b1');
    confirmSpy.mockRestore();
  });
});

describe('Roster invitation status', () => {
  const applied = (over: Record<string, unknown> = {}, invited?: Record<string, unknown>) => ({
    id: 'b1',
    kind: 'student',
    status: 'applied',
    filename: 'roster.csv',
    created_at: '2026-10-01T10:00:00Z',
    applied_at: '2026-10-01T10:05:00Z',
    invited_at: invited ? '2026-10-01T10:10:00Z' : null,
    uploaded_by: 'admin@x.test',
    summary: {
      applied: { created: 5, linked: 0, updated: 0 },
      ...(invited ? { invited } : {}),
    },
    ...over,
  }) as unknown as RosterBatch;

  const noHistory = { programmes: vi.fn().mockResolvedValue({ results: [] }) };

  it('shows a normal completion without any incomplete warning', async () => {
    const api = {
      ...noHistory,
      rosterBatches: vi.fn().mockResolvedValue({ results: [applied({}, { sent: 4, skipped: 0, failed: 1 })] }),
      rosterBatch: vi.fn().mockResolvedValue(applied({}, { sent: 4, skipped: 0, failed: 1 })),
    };
    const { fixture, el, cmp } = setup(ParticipantsAdminComponent, api as never);
    await settle(fixture);
    await cmp.open('b1');
    await settle(fixture);
    expect(el.querySelector('[data-testid="invite-incomplete"]')).toBeNull();
    expect(el.querySelector('[data-testid="invite-complete"]')?.textContent).toContain('4 sent, 1 failed');
    expect(el.textContent).not.toContain('Incomplete — action required');
  });

  it('shows partial-failure counts, explains recovery, and offers no retry', async () => {
    const batch = applied({}, { sent: 2, skipped: 0, failed: 0, incomplete: true });
    const api = { ...noHistory, rosterBatches: vi.fn().mockResolvedValue({ results: [batch] }), rosterBatch: vi.fn().mockResolvedValue(batch) };
    const { fixture, el, cmp } = setup(ParticipantsAdminComponent, api as never);
    await settle(fixture);
    await cmp.open('b1');
    await settle(fixture);
    const banner = el.querySelector('[data-testid="invite-incomplete"]') as HTMLElement;
    expect(banner).not.toBeNull();
    expect(banner.textContent).toContain('Incomplete — action required');
    expect(banner.textContent).toContain('Some invitations may already have been sent');
    expect(banner.textContent).toContain('Automatic batch retry is unavailable');
    expect(el.querySelector('[data-testid="invite-counts"]')?.textContent).toContain('Attempted: 2 · Sent: 2 · Failed: 0');
    expect(el.querySelector('[data-testid="invite-counts"]')?.textContent).toContain('Not processed: 3');
    expect(button(el, 'Send invitations')).toBeUndefined();
    expect(button(el, 'Yes, send invitations')).toBeUndefined();
  });

  it('keeps the incomplete state after a reload (state comes from the backend, not the session)', async () => {
    const batch = applied({}, { sent: 1, skipped: 0, failed: 0, incomplete: true });
    const api = {
      ...noHistory,
      rosterBatches: vi.fn().mockResolvedValue({ results: [batch] }),
      rosterBatch: vi.fn().mockResolvedValue(batch),
    };
    const first = setup(ParticipantsAdminComponent, api as never);
    await settle(first.fixture);
    expect(first.el.textContent).toContain('Incomplete — action required');
    first.fixture.destroy();
    TestBed.resetTestingModule();

    const reloaded = setup(ParticipantsAdminComponent, api as never);
    await settle(reloaded.fixture);
    expect(reloaded.el.textContent).toContain('Incomplete — action required');
    await reloaded.cmp.open('b1');
    await settle(reloaded.fixture);
    expect(api.rosterBatch).toHaveBeenCalledWith('b1');
    expect(reloaded.el.querySelector('[data-testid="invite-incomplete"]')).not.toBeNull();
  });

  it('marks counts as unknown when a run was claimed but no result was recorded', async () => {
    const batch = applied({ invited_at: '2026-10-01T10:10:00Z' });
    const api = { ...noHistory, rosterBatches: vi.fn().mockResolvedValue({ results: [] }), rosterBatch: vi.fn().mockResolvedValue(batch) };
    const { fixture, el, cmp } = setup(ParticipantsAdminComponent, api as never);
    await settle(fixture);
    await cmp.open('b1');
    await settle(fixture);
    expect(el.querySelector('[data-testid="invite-incomplete"]')?.textContent).toContain('counts are unknown');
    expect(el.textContent).not.toContain('Invitations sent');
  });

  it('when the invite request fails part-way, shows the persisted incomplete state, not the raw error', async () => {
    const validated = applied({ status: 'applied' });
    const persisted = applied({}, { sent: 1, skipped: 0, failed: 0, incomplete: true });
    const api = {
      ...noHistory,
      rosterBatches: vi.fn().mockResolvedValue({ results: [] }),
      applyRoster: vi.fn(),
      inviteRoster: vi.fn().mockRejectedValue(new ApiError(500, 'invitation_incomplete', 'Invitations stopped part-way, so some may already have been sent.')),
      rosterBatch: vi.fn().mockResolvedValue(persisted),
    };
    const { fixture, el, cmp } = setup(ParticipantsAdminComponent, api as never);
    await settle(fixture);
    cmp.batch.set(validated);
    await settle(fixture);
    await cmp.invite();
    await settle(fixture);
    expect(api.rosterBatch).toHaveBeenCalledWith('b1');
    expect(el.querySelector('[data-testid="invite-incomplete"]')).not.toBeNull();
    expect(el.textContent).toContain('Invitations stopped part-way');
    expect(el.textContent).toContain('Automatic retry is unavailable');
    expect(el.querySelector('[data-testid="invite-incomplete"]')?.textContent).toContain('Not processed');
    expect(button(el, 'Yes, send invitations')).toBeUndefined();
  });

  it('for invitation_incomplete, still shows the safe notice when the reload fails, and no raw text', async () => {
    const api = {
      ...noHistory,
      rosterBatches: vi.fn().mockResolvedValue({ results: [] }),
      inviteRoster: vi.fn().mockRejectedValue(new ApiError(500, 'invitation_incomplete', 'Traceback: smtp password=hunter2')),
      rosterBatch: vi.fn().mockRejectedValue(new ApiError(0, 'network', 'Cannot reach the server.')),
    };
    const { fixture, el, cmp } = setup(ParticipantsAdminComponent, api as never);
    await settle(fixture);
    cmp.batch.set(applied());
    await settle(fixture);
    await cmp.invite();
    await settle(fixture);
    expect(el.textContent).toContain('Automatic retry is unavailable');
    expect(el.textContent).not.toContain('hunter2');
    expect(el.textContent).not.toContain('Traceback');
    expect(button(el, 'Send invitations')).toBeUndefined();
    expect(button(el, 'Yes, send invitations')).toBeUndefined();
  });

  it('shows the ordinary error when the invite fails and nothing was recorded as incomplete', async () => {
    const api = {
      ...noHistory,
      rosterBatches: vi.fn().mockResolvedValue({ results: [] }),
      inviteRoster: vi.fn().mockRejectedValue(new ApiError(409, 'conflict', 'Invitations for this roster were already sent.')),
      rosterBatch: vi.fn().mockResolvedValue(applied({}, { sent: 5, skipped: 0, failed: 0 })),
    };
    const { fixture, el, cmp } = setup(ParticipantsAdminComponent, api as never);
    await settle(fixture);
    cmp.batch.set(applied());
    await settle(fixture);
    await cmp.invite();
    await settle(fixture);
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('already sent');
    expect(el.querySelector('[data-testid="invite-incomplete"]')).toBeNull();
  });
});
