import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService, toApiError } from '../core/api.service';
import { Vertical } from '../core/api.types';
import { AuthService } from '../core/auth.service';
import { EditorApiService } from '../editor/editor-api.service';
import { ContentItemSummary } from '../editor/editor.types';

/** Mirrors backend ContentType choices (apps.content.models.ContentType) —
 * the closed set of Phase 2 content types a new page can be created as. */
const CONTENT_TYPES = ['page', 'initiative', 'nec', 'event', 'blog'] as const;

interface ContentTypeGroup {
  contentType: string;
  items: ContentItemSummary[];
}

/**
 * "Pages" directory — every editable `ContentItem` the caller can see
 * (`GET /content`, same `_visible_items` scoping the rest of the CMS API
 * already enforces), grouped by content type like an API-explorer route
 * list, each row linking straight into the Phase 2C editor
 * (`/platform/editor/:contentType/:slug`). Pure read/navigate: no new
 * authorization surface, no write path — the editor route itself already
 * does the real scope check on load.
 */
@Component({
  selector: 'app-pages-directory',
  standalone: true,
  imports: [FormsModule, RouterLink],
  providers: [EditorApiService],
  template: `
    <div class="pf-page-head">
      <div>
        <h1>Pages</h1>
        <p class="pf-muted">Every page and content item you can open in the visual editor.</p>
      </div>
      @if (canCreate()) {
        <button class="pf-btn pf-btn-primary" type="button" (click)="startCreate()">
          New page
        </button>
      }
    </div>

    @if (error()) {
      <div class="pf-alert pf-alert-error" role="alert">{{ error() }}</div>
    }

    @if (creating()) {
      <div class="pf-dialog-overlay">
        <form class="pf-card" (ngSubmit)="submitCreate()" novalidate>
          <h2>New page</h2>
          @if (createError()) {
            <div class="pf-alert pf-alert-error" role="alert">{{ createError() }}</div>
          }
          <div class="pf-form-row">
            <div class="pf-field">
              <label for="np-type">Content type</label>
              <select id="np-type" class="pf-input" [(ngModel)]="newType" name="newType">
                @for (t of contentTypes; track t) {
                  <option [value]="t">{{ t }}</option>
                }
              </select>
            </div>
            <div class="pf-field">
              <label for="np-slug">Slug</label>
              <input
                id="np-slug"
                class="pf-input"
                [(ngModel)]="newSlug"
                name="newSlug"
                required
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                placeholder="e.g. our-journey"
              />
              <small>Lowercase letters, numbers, and hyphens only.</small>
            </div>
            @if (verticals().length > 0) {
              <div class="pf-field">
                <label for="np-vertical">Owner vertical</label>
                <select id="np-vertical" class="pf-input" [(ngModel)]="newOwnerVerticalId" name="newOwnerVerticalId">
                  <option [ngValue]="null">— Organization-wide —</option>
                  @for (v of verticals(); track v.id) {
                    <option [ngValue]="v.id">{{ v.name }}</option>
                  }
                </select>
              </div>
            }
          </div>
          <div class="pf-actions">
            <button type="button" class="pf-btn" (click)="cancelCreate()" [disabled]="submittingCreate()">
              Cancel
            </button>
            <button type="submit" class="pf-btn pf-btn-primary" [disabled]="submittingCreate() || !newSlug.trim()">
              {{ submittingCreate() ? 'Creating…' : 'Create and open editor' }}
            </button>
          </div>
        </form>
      </div>
    }

    @if (!loading() && items().length > 0) {
      <div class="pf-toolbar" role="search">
        <label class="pf-sr-only" for="pd-search">Search pages</label>
        <input
          id="pd-search"
          type="search"
          class="pf-input"
          style="max-width: 20rem"
          placeholder="Search by slug or type…"
          [(ngModel)]="query"
          (ngModelChange)="applyFilter()"
        />
      </div>
    }

    @if (loading()) {
      <p class="pf-muted">Loading pages…</p>
    } @else if (items().length === 0) {
      <p class="pf-muted">No content items are visible to you yet.</p>
    } @else if (groups().length === 0) {
      <p class="pf-muted">No pages match "{{ query }}".</p>
    } @else {
      @for (group of groups(); track group.contentType) {
        <section class="pf-section">
          <h2 class="pd-group-title">{{ group.contentType }}</h2>
          <table class="pf-table">
            <caption class="pf-sr-only">
              {{ group.contentType }} pages
            </caption>
            <thead>
              <tr>
                <th scope="col">Slug</th>
                <th scope="col">State</th>
                <th scope="col">Published</th>
                <th scope="col">Draft</th>
                <th scope="col"><span class="pf-sr-only">Action</span></th>
              </tr>
            </thead>
            <tbody>
              @for (item of group.items; track item.id) {
                <tr>
                  <td data-label="Slug"><code>/{{ item.content_type }}/{{ item.slug }}</code></td>
                  <td data-label="State">
                    <span
                      class="pf-chip"
                      [class.pf-chip-ok]="item.state === 'PUBLISHED'"
                      [class.pf-chip-accent]="item.state !== 'PUBLISHED'"
                    >
                      {{ item.state }}
                    </span>
                  </td>
                  <td data-label="Published">
                    {{ item.published_version_number ? 'v' + item.published_version_number : '—' }}
                  </td>
                  <td data-label="Draft">
                    {{ item.draft_version_number ? 'v' + item.draft_version_number : '—' }}
                  </td>
                  <td class="pf-actions">
                    <a
                      class="pf-btn pf-btn-sm pf-btn-primary"
                      [routerLink]="['/platform/editor', item.content_type, item.slug]"
                    >
                      Edit
                    </a>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </section>
      }
    }
  `,
  styles: `
    .pd-group-title {
      font-size: 0.95rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--pf-muted, #6b7280);
      margin: 1.5rem 0 0.5rem;
    }
  `,
})
export class PagesDirectoryComponent implements OnInit {
  private api = inject(EditorApiService);
  private apiService = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);

  protected loading = signal(true);
  protected error = signal<string | null>(null);
  protected items = signal<ContentItemSummary[]>([]);
  protected groups = signal<ContentTypeGroup[]>([]);
  protected query = '';

  protected readonly contentTypes = CONTENT_TYPES;
  protected verticals = signal<Vertical[]>([]);
  protected creating = signal(false);
  protected createError = signal<string | null>(null);
  protected submittingCreate = signal(false);
  protected newType: string = CONTENT_TYPES[0];
  protected newSlug = '';
  protected newOwnerVerticalId: string | null = null;

  /** Mirrors the server's own gate on `POST /content` — hiding the button for
   * someone with no `content.submit` grant anywhere is UX only, never the
   * real authorization (the server re-checks at the exact chosen scope). */
  protected canCreate = () => this.auth.canAnywhere('content.submit');

  async ngOnInit(): Promise<void> {
    try {
      const all = await this.collectAll();
      this.items.set(all);
      this.applyFilter();
      if (this.canCreate()) {
        const verticalsPage = await this.apiService.verticals();
        this.verticals.set(verticalsPage.results);
      }
    } catch (e) {
      this.error.set(toApiError(e).message || 'Could not load pages.');
    } finally {
      this.loading.set(false);
    }
  }

  startCreate(): void {
    this.newType = CONTENT_TYPES[0];
    this.newSlug = '';
    this.newOwnerVerticalId = null;
    this.createError.set(null);
    this.creating.set(true);
  }

  cancelCreate(): void {
    this.creating.set(false);
  }

  async submitCreate(): Promise<void> {
    const slug = this.newSlug.trim().toLowerCase();
    if (!slug) return;
    this.submittingCreate.set(true);
    this.createError.set(null);
    try {
      const item = await this.api.createItem({
        content_type: this.newType,
        slug,
        owner_vertical_id: this.newOwnerVerticalId,
      });
      this.creating.set(false);
      await this.router.navigate(['/platform/editor', item.content_type, item.slug]);
    } catch (e) {
      const err = toApiError(e);
      this.createError.set(
        err.status === 409
          ? 'A page with this type and slug already exists.'
          : err.message || 'Could not create the page.',
      );
    } finally {
      this.submittingCreate.set(false);
    }
  }

  applyFilter(): void {
    const q = this.query.trim().toLowerCase();
    const filtered = !q
      ? this.items()
      : this.items().filter(
          (i) => i.slug.toLowerCase().includes(q) || i.content_type.toLowerCase().includes(q),
        );
    this.groups.set(this.groupByType(filtered));
  }

  private groupByType(items: ContentItemSummary[]): ContentTypeGroup[] {
    const byType = new Map<string, ContentItemSummary[]>();
    for (const item of items) {
      const list = byType.get(item.content_type) ?? [];
      list.push(item);
      byType.set(item.content_type, list);
    }
    return [...byType.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([contentType, group]) => ({
        contentType,
        items: group.sort((a, b) => a.slug.localeCompare(b.slug)),
      }));
  }

  private async collectAll(): Promise<ContentItemSummary[]> {
    const out: ContentItemSummary[] = [];
    let page = 1;
    // Bounded loop: a content directory is small in practice (pages, not a
    // public feed) — caps pathological cases at 20 pages instead of looping
    // forever on server misbehavior, same convention as the approval inbox.
    for (let i = 0; i < 20; i++) {
      const result = await this.api.listItems(page);
      out.push(...result.results);
      if (!result.next) break;
      page += 1;
    }
    return out;
  }
}
