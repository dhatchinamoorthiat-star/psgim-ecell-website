import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { QrService } from '../../core/services/qr.service';
import { MyRegistration, OperationsApiService } from '../operations/operations-api.service';
import { MyEventsComponent } from './my-events.component';
import { MyRegistrationComponent } from './my-registration.component';
import { RegisterComponent } from './register.component';

function reg(over: Partial<MyRegistration> = {}): MyRegistration {
  return {
    id: 'r1',
    event: {
      slug: 'demo-day',
      title: 'Demo Day',
      starts_at: '2099-05-01T10:00:00Z',
      ends_at: null,
      venue: 'Hall A',
      status: 'active',
      cancel_reason: '',
    },
    status: 'confirmed',
    participant_type: 'student',
    registered_at: '2099-04-01T10:00:00Z',
    can_cancel: true,
    checked_in: false,
    pass: { state: 'not_issued' },
    ...over,
  };
}

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
  params: Record<string, string> = {},
  query: Record<string, string> = {},
) {
  const qr = { render: vi.fn(() => ({ ok: true, message: '' })), whenLogoReady: vi.fn() };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: OperationsApiService, useValue: api },
      { provide: QrService, useValue: qr },
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            paramMap: convertToParamMap(params),
            queryParamMap: convertToParamMap(query),
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
    qr,
    cmp: fixture.componentInstance as any,
  };
}

describe('Participant screens', () => {
  beforeAll(() => {
    // This jsdom has no Web Storage; the pass page keeps its token there.
    if (!(globalThis as any).localStorage) {
      const store = new Map<string, string>();
      (globalThis as any).localStorage = {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => store.set(k, String(v)),
        removeItem: (k: string) => store.delete(k),
        clear: () => store.clear(),
      };
    }
  });
  beforeEach(() => localStorage.clear());

  it('My events shows an empty state, then registrations with their status', async () => {
    const api = { myRegistrations: vi.fn().mockResolvedValueOnce({ results: [] }) };
    const { fixture, el } = setup(MyEventsComponent, api);
    await settle(fixture);
    expect(el.textContent).toContain('No registrations yet');
  });

  it('My events lists registrations and offers the pass', async () => {
    const api = {
      myRegistrations: vi
        .fn()
        .mockResolvedValue({ results: [reg(), reg({ id: 'r2', status: 'waitlisted' })] }),
    };
    const { fixture, el } = setup(MyEventsComponent, api);
    await settle(fixture);
    expect(el.textContent).toContain('Confirmed');
    expect(el.textContent).toContain('On the waitlist');
    expect(el.textContent).toContain('View pass');
  });

  it('My events shows an error with Retry', async () => {
    const api = {
      myRegistrations: vi
        .fn()
        .mockRejectedValueOnce(new Error('x'))
        .mockResolvedValue({ results: [] }),
    };
    const { fixture, el } = setup(MyEventsComponent, api);
    await settle(fixture);
    const retry = el.querySelector('[role="alert"] button') as HTMLButtonElement;
    expect(retry).toBeTruthy();
    retry.click();
    await settle(fixture);
    expect(el.textContent).toContain('No registrations yet');
  });

  it('shows the pass after issuing it, stores it on this device, and draws the QR from the token', async () => {
    const issued = reg({ pass: { state: 'active', issued_at: '2099-04-02T10:00:00Z' } });
    const api = {
      myRegistration: vi.fn().mockResolvedValue(reg()),
      issuePass: vi
        .fn()
        .mockResolvedValue({ token: 'TOKEN-123', code: 'ABCDE-FGHJK', registration: issued }),
    };
    const { fixture, el, qr } = setup(MyRegistrationComponent, api, { id: 'r1' });
    await settle(fixture);
    (
      Array.from(el.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Show my pass'),
      ) as HTMLButtonElement
    ).click();
    await settle(fixture);
    expect(api.issuePass).toHaveBeenCalledWith('r1', false);
    expect(el.textContent).toContain('ABCDE-FGHJK');
    expect(qr.render).toHaveBeenCalled();
    expect((qr.render.mock.calls[0] as unknown[])[1]).toBe('TOKEN-123');
    expect(JSON.parse(localStorage.getItem('ecell.pass.r1')!).token).toBe('TOKEN-123');
  });

  it('discards a stored pass that is no longer the active one and offers replacement', async () => {
    localStorage.setItem(
      'ecell.pass.r1',
      JSON.stringify({ token: 'OLD', code: 'OLDCD-00000', issuedAt: 'old' }),
    );
    const api = {
      myRegistration: vi
        .fn()
        .mockResolvedValue(reg({ pass: { state: 'active', issued_at: 'new' } })),
    };
    const { fixture, el } = setup(MyRegistrationComponent, api, { id: 'r1' });
    await settle(fixture);
    expect(localStorage.getItem('ecell.pass.r1')).toBeNull();
    expect(el.textContent).not.toContain('OLDCD-00000');
    expect(el.textContent).toContain("we can't");
  });

  it('asks before replacing a pass', async () => {
    localStorage.setItem('ecell.pass.r1', JSON.stringify({ token: 'T', code: 'C', issuedAt: 'i' }));
    const api = {
      myRegistration: vi.fn().mockResolvedValue(reg({ pass: { state: 'active', issued_at: 'i' } })),
      issuePass: vi.fn().mockResolvedValue({
        token: 'T2',
        code: 'C2',
        registration: reg({ pass: { state: 'active', issued_at: 'j' } }),
      }),
    };
    const { fixture, el } = setup(MyRegistrationComponent, api, { id: 'r1' });
    await settle(fixture);
    (
      Array.from(el.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === 'Replace pass',
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    expect(api.issuePass).not.toHaveBeenCalled();
    expect(el.querySelector('[role="alertdialog"]')).toBeTruthy();
    (
      Array.from(el.querySelectorAll('[role="alertdialog"] button')).find(
        (b) => b.textContent?.trim() === 'Replace',
      ) as HTMLButtonElement
    ).click();
    await settle(fixture);
    expect(api.issuePass).toHaveBeenCalledWith('r1', true);
  });

  it('shows revoked and event-cancelled states clearly', async () => {
    const api = {
      myRegistration: vi.fn().mockResolvedValue(
        reg({
          status: 'event_cancelled',
          can_cancel: false,
          event: { ...reg().event, status: 'cancelled', cancel_reason: 'Venue unavailable' },
          pass: { state: 'revoked', reason: 'event cancelled' },
        }),
      ),
    };
    const { fixture, el } = setup(MyRegistrationComponent, api, { id: 'r1' });
    await settle(fixture);
    expect(el.textContent).toContain('This event was cancelled: Venue unavailable');
    expect(el.querySelector('canvas')).toBeNull();
    expect(el.textContent).not.toContain('Cancel registration');
  });

  it('cancelling needs a confirmation and clears the stored pass', async () => {
    localStorage.setItem('ecell.pass.r1', JSON.stringify({ token: 'T', code: 'C', issuedAt: 'i' }));
    const api = {
      myRegistration: vi.fn().mockResolvedValue(reg({ pass: { state: 'active', issued_at: 'i' } })),
      cancelMine: vi
        .fn()
        .mockResolvedValue(
          reg({ status: 'cancelled', can_cancel: false, pass: { state: 'revoked' } }),
        ),
    };
    const { fixture, el } = setup(MyRegistrationComponent, api, { id: 'r1' });
    await settle(fixture);
    (
      Array.from(el.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Cancel registration'),
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    expect(api.cancelMine).not.toHaveBeenCalled();
    (
      Array.from(el.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Yes, cancel'),
      ) as HTMLButtonElement
    ).click();
    await settle(fixture);
    expect(api.cancelMine).toHaveBeenCalledWith('r1');
    expect(localStorage.getItem('ecell.pass.r1')).toBeNull();
    expect(el.textContent).toContain('cancelled');
  });

  it('register page explains ineligibility and never offers the button', async () => {
    const api = {
      myEvent: vi.fn().mockResolvedValue({
        event: { slug: 'demo-day', title: 'Demo Day', starts_at: null, ends_at: null, venue: '' },
        availability: {
          state: 'open',
          opens_at: null,
          closes_at: null,
          students: true,
          external: false,
          spots_left: null,
        },
        eligibility: {
          eligible: false,
          participant_type: null,
          reason: 'Registration is for PSGIM students and approved external participants.',
        },
        registration: null,
      }),
    };
    const { fixture, el } = setup(RegisterComponent, api, { slug: 'demo-day' });
    await settle(fixture);
    expect(el.querySelector('[role="alert"]')?.textContent).toContain(
      'approved external participants',
    );
    expect(
      Array.from(el.querySelectorAll('button')).some((b) =>
        b.textContent?.includes('Confirm registration'),
      ),
    ).toBe(false);
  });

  it('register page registers an eligible participant and opens the registration', async () => {
    const api = {
      myEvent: vi.fn().mockResolvedValue({
        event: { slug: 'demo-day', title: 'Demo Day', starts_at: null, ends_at: null, venue: '' },
        availability: {
          state: 'open',
          opens_at: null,
          closes_at: null,
          students: true,
          external: false,
          spots_left: 3,
        },
        eligibility: { eligible: true, participant_type: 'student', reason: '' },
        registration: null,
      }),
      register: vi.fn().mockResolvedValue(reg()),
    };
    const { fixture, el } = setup(RegisterComponent, api, { slug: 'demo-day' });
    const router = TestBed.inject(Router);
    const nav = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    await settle(fixture);
    expect(el.textContent).toContain('3 place(s) left');
    (
      Array.from(el.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Confirm registration'),
      ) as HTMLButtonElement
    ).click();
    await settle(fixture);
    expect(api.register).toHaveBeenCalledWith('demo-day');
    expect(nav).toHaveBeenCalledWith(['/platform/my-events', 'r1'], {
      queryParams: { registered: 1 },
    });
  });
});

describe('Register page waitlist offer', () => {
  const eventStatus = (over: Record<string, unknown>) => ({
    event: { slug: 'demo-day', title: 'Demo Day', starts_at: null, ends_at: null, venue: '' },
    availability: {
      state: 'waitlist',
      opens_at: null,
      closes_at: null,
      students: true,
      external: false,
      spots_left: 0,
    },
    eligibility: { eligible: true, participant_type: 'student', reason: '' },
    registration: null,
    ...over,
  });
  const hasWaitlistButton = (el: HTMLElement) =>
    Array.from(el.querySelectorAll('button')).some((b) => b.textContent?.includes('Join the waitlist'));

  it('does not offer the waitlist to an ineligible account', async () => {
    const api = {
      myEvent: vi.fn().mockResolvedValue(
        eventStatus({
          eligibility: { eligible: false, participant_type: null, reason: 'This event is limited to other programmes.' },
        }),
      ),
    };
    const { fixture, el } = setup(RegisterComponent, api, { slug: 'demo-day' });
    await settle(fixture);
    expect(el.querySelector('[role="status"]')?.textContent).toBe('This event is full.');
    expect(el.textContent).not.toContain('join the waitlist');
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('limited to other programmes');
    expect(hasWaitlistButton(el)).toBe(false);
  });

  it('does not offer the waitlist again to an account already on it', async () => {
    const api = {
      myEvent: vi.fn().mockResolvedValue(
        eventStatus({
          registration: { id: 'r1', status: 'waitlisted' },
        }),
      ),
    };
    const { fixture, el } = setup(RegisterComponent, api, { slug: 'demo-day' });
    await settle(fixture);
    expect(el.querySelector('[role="status"]')?.textContent).toBe('This event is full.');
    expect(hasWaitlistButton(el)).toBe(false);
  });

  it('offers the waitlist to an eligible account that is not registered', async () => {
    const api = { myEvent: vi.fn().mockResolvedValue(eventStatus({})) };
    const { fixture, el } = setup(RegisterComponent, api, { slug: 'demo-day' });
    await settle(fixture);
    expect(el.querySelector('[role="status"]')?.textContent).toContain('you can join the waitlist');
    expect(hasWaitlistButton(el)).toBe(true);
  });
});
