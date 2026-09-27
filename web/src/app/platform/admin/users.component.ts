import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService, toApiError } from '../core/api.service';
import { Page, User } from '../core/api.types';
import { AuthService } from '../core/auth.service';
import { ConfirmDialogComponent } from '../ui/confirm-dialog.component';

@Component({
  selector: 'app-users',
  imports: [DatePipe, FormsModule, ReactiveFormsModule, ConfirmDialogComponent],
  template: `
    <div class="pf-page-head">
      <div>
        <h1>Users</h1>
        <p>
          {{
            auth.canGlobal('user.view')
              ? 'Everyone with a platform account.'
              : 'Members of your vertical(s) this year.'
          }}
        </p>
      </div>
      @if (canManage()) {
        <button class="pf-btn pf-btn-primary" type="button" (click)="showCreate.set(!showCreate())">
          {{ showCreate() ? 'Close' : 'Add user' }}
        </button>
      }
    </div>

    @if (message()) {
      <div
        class="pf-alert"
        [class.pf-alert-error]="messageIsError()"
        [class.pf-alert-ok]="!messageIsError()"
        role="status"
      >
        {{ message() }}
      </div>
    }

    @if (showCreate()) {
      <form class="pf-card" [formGroup]="createForm" (ngSubmit)="create()" novalidate>
        <h2>New account</h2>
        <div class="pf-form-row">
          <div class="pf-field">
            <label for="nu-name">Full name</label>
            <input id="nu-name" class="pf-input" formControlName="full_name" required />
          </div>
          <div class="pf-field">
            <label for="nu-email">Email</label>
            <input
              id="nu-email"
              class="pf-input"
              type="email"
              formControlName="email"
              required
              [attr.aria-invalid]="!!createErrors()['email']"
            />
            @for (m of createErrors()['email'] ?? []; track m) {
              <span class="pf-field-error">{{ m }}</span>
            }
          </div>
        </div>
        <label class="pf-check"
          ><input type="checkbox" formControlName="send_invite" /> Email them a link to choose a
          password</label
        >
        <button class="pf-btn pf-btn-primary" type="submit" [disabled]="busy()">
          Create account
        </button>
      </form>
    }

    <div class="pf-toolbar" role="search">
      <label class="pf-sr-only" for="u-q">Search users</label>
      <input
        id="u-q"
        class="pf-input"
        style="max-width: 20rem"
        placeholder="Search name or email"
        [(ngModel)]="q"
        (keyup.enter)="load(1)"
      />
      <label class="pf-sr-only" for="u-status">Status</label>
      <select
        id="u-status"
        class="pf-select"
        style="max-width: 12rem"
        [(ngModel)]="status"
        (change)="load(1)"
      >
        <option value="">All statuses</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
        <option value="alumni">Alumni</option>
      </select>
      <button class="pf-btn" type="button" (click)="load(1)">Search</button>
    </div>

    @if (page(); as p) {
      <table class="pf-table">
        <caption class="pf-sr-only">
          Users
        </caption>
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Email</th>
            <th scope="col">Status</th>
            <th scope="col">Last sign-in</th>
            <th scope="col"><span class="pf-sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          @for (u of p.results; track u.id) {
            <tr>
              <td data-label="Name">{{ u.full_name }}</td>
              <td data-label="Email">{{ u.email }}</td>
              <td data-label="Status">
                <span
                  class="pf-chip"
                  [class.pf-chip-ok]="u.status === 'active'"
                  [class.pf-chip-warn]="u.status !== 'active'"
                  >{{ u.status }}</span
                >
              </td>
              <td data-label="Last sign-in">
                {{ u.last_login ? (u.last_login | date: 'medium') : '—' }}
              </td>
              <td class="pf-actions">
                @if (canManage() && u.id !== auth.user()?.id) {
                  @if (u.status === 'active') {
                    <button
                      class="pf-btn pf-btn-sm pf-btn-danger"
                      type="button"
                      (click)="askDeactivate(u)"
                    >
                      Deactivate
                    </button>
                  } @else {
                    <button class="pf-btn pf-btn-sm" type="button" (click)="reactivate(u)">
                      Reactivate
                    </button>
                  }
                }
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="5" class="pf-muted">No users found.</td>
            </tr>
          }
        </tbody>
      </table>
      <div class="pf-toolbar">
        <span class="pf-muted">{{ p.count }} user(s)</span>
        <button
          class="pf-btn pf-btn-sm"
          type="button"
          [disabled]="!p.previous"
          (click)="load(pageNo() - 1)"
        >
          Previous
        </button>
        <button
          class="pf-btn pf-btn-sm"
          type="button"
          [disabled]="!p.next"
          (click)="load(pageNo() + 1)"
        >
          Next
        </button>
      </div>
    } @else {
      <p class="pf-muted" role="status">Loading…</p>
    }

    <app-confirm-dialog
      #confirmDeactivate
      title="Deactivate account?"
      confirmLabel="Deactivate"
      [message]="
        (pending()?.full_name ?? '') +
        ' will be signed out everywhere and can no longer sign in. Their history is kept.'
      "
      (confirmed)="deactivate()"
    />
  `,
})
export class UsersComponent implements OnInit {
  private api = inject(ApiService);
  protected auth = inject(AuthService);
  private confirmDeactivate = viewChild.required<ConfirmDialogComponent>('confirmDeactivate');

  protected page = signal<Page<User> | null>(null);
  protected pageNo = signal(1);
  protected q = '';
  protected status = '';
  protected showCreate = signal(false);
  protected busy = signal(false);
  protected message = signal('');
  protected messageIsError = signal(false);
  protected createErrors = signal<Record<string, string[]>>({});
  protected pending = signal<User | null>(null);
  protected createForm = inject(FormBuilder).nonNullable.group({
    full_name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    send_invite: [true],
  });

  protected canManage = () => this.auth.canGlobal('user.manage');

  ngOnInit(): void {
    void this.load(1);
  }

  async load(n: number): Promise<void> {
    try {
      this.page.set(await this.api.users({ page: n, q: this.q, status: this.status }));
      this.pageNo.set(n);
    } catch (e) {
      this.flash(toApiError(e).message, true);
    }
  }

  async create(): Promise<void> {
    if (this.createForm.invalid) return this.flash('Enter a name and a valid email.', true);
    this.busy.set(true);
    this.createErrors.set({});
    try {
      const u = await this.api.createUser(this.createForm.getRawValue());
      this.flash(
        `Created ${u.email}.${this.createForm.getRawValue().send_invite ? ' An invitation email was sent.' : ''}`,
      );
      this.createForm.reset({ full_name: '', email: '', send_invite: true });
      this.showCreate.set(false);
      await this.load(1);
    } catch (e) {
      const err = toApiError(e);
      this.createErrors.set(err.fields);
      this.flash(err.message, true);
    } finally {
      this.busy.set(false);
    }
  }

  askDeactivate(u: User): void {
    this.pending.set(u);
    this.confirmDeactivate().open();
  }

  async deactivate(): Promise<void> {
    const u = this.pending();
    if (!u) return;
    try {
      await this.api.deactivateUser(u.id);
      this.flash(`${u.email} was deactivated.`);
      await this.load(this.pageNo());
    } catch (e) {
      this.flash(toApiError(e).message, true);
    }
  }

  async reactivate(u: User): Promise<void> {
    try {
      await this.api.reactivateUser(u.id);
      this.flash(`${u.email} was reactivated.`);
      await this.load(this.pageNo());
    } catch (e) {
      this.flash(toApiError(e).message, true);
    }
  }

  private flash(msg: string, isError = false): void {
    this.message.set(msg);
    this.messageIsError.set(isError);
  }
}
