import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService, toApiError } from '../core/api.service';
import { Page, Role, RoleAssignment, User, Vertical } from '../core/api.types';
import { AuthService } from '../core/auth.service';
import { ConfirmDialogComponent } from '../ui/confirm-dialog.component';

@Component({
  selector: 'app-assignments',
  imports: [DatePipe, FormsModule, ReactiveFormsModule, ConfirmDialogComponent],
  template: `
    <div class="pf-page-head">
      <div>
        <h1>Role assignments</h1>
        <p>Who holds which role, and where. Revoked assignments are kept as history.</p>
      </div>
      @if (canAssign()) {
        <button class="pf-btn pf-btn-primary" type="button" (click)="toggleCreate()">
          {{ showCreate() ? 'Close' : 'Assign a role' }}
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
      <form class="pf-card" [formGroup]="form" (ngSubmit)="assign()" novalidate>
        <h2>Assign a role</h2>
        <p class="pf-muted">
          The server checks that you may grant this role here; you cannot assign roles to yourself.
        </p>
        <div class="pf-form-row">
          <div class="pf-field">
            <label for="a-user">Person</label>
            <select id="a-user" class="pf-select" formControlName="user_id" required>
              <option value="" disabled>Choose…</option>
              @for (u of users(); track u.id) {
                <option [value]="u.id">{{ u.full_name }} — {{ u.email }}</option>
              }
            </select>
          </div>
          <div class="pf-field">
            <label for="a-role">Role</label>
            <select id="a-role" class="pf-select" formControlName="role" required>
              <option value="" disabled>Choose…</option>
              @for (r of roles(); track r.id) {
                <option [value]="r.key">{{ r.name }}</option>
              }
            </select>
          </div>
        </div>
        <div class="pf-form-row">
          <div class="pf-field">
            <label for="a-scope">Applies to</label>
            <select id="a-scope" class="pf-select" formControlName="scope_type">
              <option value="VERTICAL">One vertical</option>
              <option value="GLOBAL">The whole organisation</option>
            </select>
          </div>
          @if (form.controls.scope_type.value === 'VERTICAL') {
            <div class="pf-field">
              <label for="a-vertical">Vertical</label>
              <select id="a-vertical" class="pf-select" formControlName="scope_id">
                <option value="" disabled>Choose…</option>
                @for (v of verticals(); track v.id) {
                  <option [value]="v.id">{{ v.name }}</option>
                }
              </select>
            </div>
          }
        </div>
        <div class="pf-field">
          <label for="a-note">Note (optional)</label>
          <input id="a-note" class="pf-input" formControlName="note" maxlength="300" />
        </div>
        <button class="pf-btn pf-btn-primary" type="submit" [disabled]="busy()">Assign</button>
      </form>
    }

    <div class="pf-toolbar">
      <label class="pf-check"
        ><input type="checkbox" [(ngModel)]="activeOnly" (change)="load(1)" /> Active only</label
      >
    </div>

    @if (page(); as p) {
      <table class="pf-table">
        <caption class="pf-sr-only">
          Role assignments
        </caption>
        <thead>
          <tr>
            <th scope="col">Person</th>
            <th scope="col">Role</th>
            <th scope="col">Scope</th>
            <th scope="col">Since</th>
            <th scope="col">Status</th>
            <th scope="col"><span class="pf-sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          @for (a of p.results; track a.id) {
            <tr>
              <td data-label="Person">
                {{ a.user.full_name }}<br /><span class="pf-muted">{{ a.user.email }}</span>
              </td>
              <td data-label="Role">{{ a.role_name }}</td>
              <td data-label="Scope">{{ scopeLabel(a) }}</td>
              <td data-label="Since">
                {{ a.starts_at | date: 'mediumDate' }}<br /><span class="pf-muted"
                  >by {{ a.assigned_by ?? '—' }}</span
                >
              </td>
              <td data-label="Status">
                @if (a.revoked_at) {
                  <span class="pf-chip pf-chip-warn"
                    >revoked {{ a.revoked_at | date: 'mediumDate' }}</span
                  >
                } @else {
                  <span class="pf-chip pf-chip-ok">active</span>
                }
              </td>
              <td class="pf-actions">
                @if (canAssign() && !a.revoked_at && a.user.id !== auth.user()?.id) {
                  <button
                    class="pf-btn pf-btn-sm pf-btn-danger"
                    type="button"
                    (click)="askRevoke(a)"
                  >
                    Revoke
                  </button>
                }
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="6" class="pf-muted">No assignments.</td>
            </tr>
          }
        </tbody>
      </table>
      <div class="pf-toolbar">
        <span class="pf-muted">{{ p.count }} assignment(s)</span>
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
      #confirmRevoke
      title="Revoke role?"
      confirmLabel="Revoke"
      [withReason]="true"
      [message]="
        (pending()?.user?.full_name ?? '') +
        ' will lose ' +
        (pending()?.role_name ?? '') +
        ' immediately. The record is kept.'
      "
      (confirmed)="revoke($event.reason)"
    />
  `,
})
export class AssignmentsComponent implements OnInit {
  private api = inject(ApiService);
  protected auth = inject(AuthService);
  private confirmRevoke = viewChild.required<ConfirmDialogComponent>('confirmRevoke');

  protected page = signal<Page<RoleAssignment> | null>(null);
  protected pageNo = signal(1);
  protected activeOnly = true;
  protected roles = signal<Role[]>([]);
  protected users = signal<User[]>([]);
  protected verticals = signal<Vertical[]>([]);
  private verticalNames = computed(() => new Map(this.verticals().map((v) => [v.id, v.name])));
  protected showCreate = signal(false);
  protected busy = signal(false);
  protected pending = signal<RoleAssignment | null>(null);
  protected message = signal('');
  protected messageIsError = signal(false);
  protected form = inject(FormBuilder).nonNullable.group({
    user_id: ['', Validators.required],
    role: ['', Validators.required],
    scope_type: ['VERTICAL'],
    scope_id: [''],
    note: [''],
  });

  protected canAssign = () =>
    this.auth.canAnywhere('role.assign') || this.auth.canAnywhere('vertical_head.assign');

  async ngOnInit(): Promise<void> {
    await this.load(1);
    try {
      this.verticals.set((await this.api.verticals({ page_size: 100 })).results);
    } catch {
      /* the scope column falls back to ids */
    }
  }

  async load(n: number): Promise<void> {
    try {
      this.page.set(
        await this.api.assignments({ page: n, active: this.activeOnly ? 'true' : undefined }),
      );
      this.pageNo.set(n);
    } catch (e) {
      this.flash(toApiError(e).message, true);
    }
  }

  async toggleCreate(): Promise<void> {
    this.showCreate.set(!this.showCreate());
    if (this.showCreate() && this.roles().length === 0) {
      try {
        const [roles, users] = await Promise.all([
          this.api.roles(),
          this.api.users({ page_size: 100, status: 'active' }),
        ]);
        this.roles.set(roles);
        this.users.set(users.results.filter((u) => u.id !== this.auth.user()?.id));
      } catch (e) {
        this.flash(toApiError(e).message, true);
      }
    }
  }

  scopeLabel(a: RoleAssignment): string {
    if (a.scope_type === 'GLOBAL') return 'Whole organisation';
    return `${a.scope_type.toLowerCase()}: ${this.verticalNames().get(a.scope_id ?? '') ?? a.scope_id}`;
  }

  async assign(): Promise<void> {
    const v = this.form.getRawValue();
    if (!v.user_id || !v.role || (v.scope_type === 'VERTICAL' && !v.scope_id)) {
      return this.flash('Choose a person, a role and where it applies.', true);
    }
    this.busy.set(true);
    try {
      await this.api.assign({ ...v, scope_id: v.scope_type === 'GLOBAL' ? null : v.scope_id });
      this.flash('Role assigned.');
      this.form.reset({ user_id: '', role: '', scope_type: 'VERTICAL', scope_id: '', note: '' });
      this.showCreate.set(false);
      await this.load(1);
    } catch (e) {
      this.flash(toApiError(e).message, true);
    } finally {
      this.busy.set(false);
    }
  }

  askRevoke(a: RoleAssignment): void {
    this.pending.set(a);
    this.confirmRevoke().open();
  }

  async revoke(reason: string): Promise<void> {
    const a = this.pending();
    if (!a) return;
    try {
      await this.api.revoke(a.id, reason);
      this.flash(`${a.role_name} revoked from ${a.user.full_name}.`);
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
