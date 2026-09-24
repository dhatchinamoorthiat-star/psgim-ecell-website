import { Component, OnInit, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService, toApiError } from '../core/api.service';
import { Vertical } from '../core/api.types';
import { AuthService } from '../core/auth.service';
import { ConfirmDialogComponent } from '../ui/confirm-dialog.component';

/**
 * Verticals are data (docs/ORGANIZATIONAL_STRUCTURE.md): adding, renaming or
 * archiving one needs no code change. The real list for 2026-27 is still an
 * open leadership decision (N-2), so nothing is pre-filled here.
 */
@Component({
  selector: 'app-verticals',
  imports: [FormsModule, ReactiveFormsModule, ConfirmDialogComponent],
  template: `
    <div class="pf-page-head">
      <div>
        <h1>Verticals</h1>
        <p>The E-Cell’s teams. Archived verticals keep their history.</p>
      </div>
      @if (canManage()) {
        <button class="pf-btn pf-btn-primary" type="button" (click)="startCreate()">
          Add vertical
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

    @if (editing() !== null) {
      <form class="pf-card" [formGroup]="form" (ngSubmit)="save()" novalidate>
        <h2>{{ editing() === 'new' ? 'New vertical' : 'Edit vertical' }}</h2>
        <div class="pf-form-row">
          <div class="pf-field">
            <label for="v-name">Name</label>
            <input id="v-name" class="pf-input" formControlName="name" required />
          </div>
          <div class="pf-field">
            <label for="v-slug">Slug</label>
            <input
              id="v-slug"
              class="pf-input"
              formControlName="slug"
              required
              aria-describedby="v-slug-help"
              [attr.aria-invalid]="!!errors()['slug']"
            />
            <small id="v-slug-help"
              >Short, lowercase, used in links. Keep it stable once in use.</small
            >
            @for (m of errors()['slug'] ?? []; track m) {
              <span class="pf-field-error">{{ m }}</span>
            }
          </div>
        </div>
        <div class="pf-field">
          <label for="v-desc">Description</label>
          <textarea
            id="v-desc"
            class="pf-textarea"
            rows="3"
            formControlName="description"
          ></textarea>
        </div>
        <div class="pf-form-row">
          <div class="pf-field">
            <label for="v-order">Display order</label>
            <input
              id="v-order"
              class="pf-input"
              type="number"
              min="0"
              formControlName="display_order"
            />
          </div>
          <label class="pf-check"
            ><input type="checkbox" formControlName="is_platform_custodian" /> Platform custodian
            (looks after the platform itself)</label
          >
        </div>
        <div class="pf-toolbar">
          <button class="pf-btn pf-btn-primary" type="submit" [disabled]="busy()">Save</button>
          <button class="pf-btn" type="button" (click)="editing.set(null)">Cancel</button>
        </div>
      </form>
    }

    <div class="pf-toolbar">
      <label class="pf-check"
        ><input type="checkbox" [(ngModel)]="includeArchived" (change)="load()" /> Show
        archived</label
      >
    </div>

    <table class="pf-table">
      <caption class="pf-sr-only">
        Verticals
      </caption>
      <thead>
        <tr>
          <th scope="col">Name</th>
          <th scope="col">Slug</th>
          <th scope="col">Description</th>
          <th scope="col">Status</th>
          <th scope="col"><span class="pf-sr-only">Actions</span></th>
        </tr>
      </thead>
      <tbody>
        @for (v of verticals(); track v.id) {
          <tr>
            <td data-label="Name">
              {{ v.name }}
              @if (v.is_platform_custodian) {
                <span class="pf-chip pf-chip-accent">custodian</span>
              }
            </td>
            <td data-label="Slug">
              <code>{{ v.slug }}</code>
            </td>
            <td data-label="Description" class="pf-muted">{{ v.description || '—' }}</td>
            <td data-label="Status">
              <span
                class="pf-chip"
                [class.pf-chip-ok]="v.is_active"
                [class.pf-chip-warn]="!v.is_active"
                >{{ v.is_active ? 'active' : 'archived' }}</span
              >
            </td>
            <td class="pf-actions">
              @if (canManage() && v.is_active) {
                <button class="pf-btn pf-btn-sm" type="button" (click)="startEdit(v)">Edit</button>
                <button
                  class="pf-btn pf-btn-sm pf-btn-danger"
                  type="button"
                  (click)="askArchive(v)"
                >
                  Archive
                </button>
              }
            </td>
          </tr>
        } @empty {
          <tr>
            <td colspan="5" class="pf-muted">
              No verticals yet.{{ canManage() ? ' Add the first one above.' : '' }}
            </td>
          </tr>
        }
      </tbody>
    </table>

    <app-confirm-dialog
      #confirmArchive
      title="Archive vertical?"
      confirmLabel="Archive"
      [message]="
        'Archiving hides ' +
        (pending()?.name ?? '') +
        ' from active use. Its memberships and history are kept. Revoke its role assignments first.'
      "
      [typeToConfirm]="pending()?.slug ?? ''"
      (confirmed)="archive($event.typed)"
    />
  `,
})
export class VerticalsComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private confirmArchive = viewChild.required<ConfirmDialogComponent>('confirmArchive');

  protected verticals = signal<Vertical[]>([]);
  protected includeArchived = false;
  protected editing = signal<'new' | Vertical | null>(null);
  protected pending = signal<Vertical | null>(null);
  protected busy = signal(false);
  protected message = signal('');
  protected messageIsError = signal(false);
  protected errors = signal<Record<string, string[]>>({});
  protected form = inject(FormBuilder).nonNullable.group({
    name: ['', Validators.required],
    slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
    description: [''],
    display_order: [100],
    is_platform_custodian: [false],
  });

  protected canManage = () => this.auth.canGlobal('vertical.manage');

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    try {
      const page = await this.api.verticals({
        include_archived: this.includeArchived,
        page_size: 100,
      });
      this.verticals.set(page.results);
    } catch (e) {
      this.flash(toApiError(e).message, true);
    }
  }

  startCreate(): void {
    this.errors.set({});
    this.form.reset({
      name: '',
      slug: '',
      description: '',
      display_order: 100,
      is_platform_custodian: false,
    });
    this.editing.set('new');
  }

  startEdit(v: Vertical): void {
    this.errors.set({});
    this.form.reset({
      name: v.name,
      slug: v.slug,
      description: v.description,
      display_order: v.display_order,
      is_platform_custodian: v.is_platform_custodian,
    });
    this.editing.set(v);
  }

  async save(): Promise<void> {
    if (this.form.invalid)
      return this.flash(
        'Name and a lowercase slug (letters, numbers, hyphens) are required.',
        true,
      );
    this.busy.set(true);
    this.errors.set({});
    try {
      const target = this.editing();
      const body = this.form.getRawValue();
      const saved =
        target === 'new'
          ? await this.api.createVertical(body)
          : await this.api.updateVertical(target!.id, body);
      this.flash(`Saved ${saved.name}.`);
      this.editing.set(null);
      await this.load();
    } catch (e) {
      const err = toApiError(e);
      this.errors.set(err.fields);
      this.flash(err.message, true);
    } finally {
      this.busy.set(false);
    }
  }

  askArchive(v: Vertical): void {
    this.pending.set(v);
    this.confirmArchive().open();
  }

  async archive(typed: string): Promise<void> {
    const v = this.pending();
    if (!v) return;
    try {
      await this.api.archiveVertical(v.id, typed);
      this.flash(`${v.name} was archived.`);
      await this.load();
    } catch (e) {
      this.flash(toApiError(e).message, true);
    }
  }

  private flash(msg: string, isError = false): void {
    this.message.set(msg);
    this.messageIsError.set(isError);
  }
}
