import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { BlockRendererComponent } from '../../shared/blocks/block-renderer.component';
import {
  ContentBlockTypeDef,
  ContentItemSummary,
  ContentVersionRecord,
  SaveStatus,
} from './editor.types';
import { EditorApiService } from './editor-api.service';
import { EditorAddBlockComponent } from './editor-add-block.component';
import { EditorCanvasComponent } from './editor-canvas.component';
import { EditorDocumentService, defaultPropsFor } from './editor-document.service';
import { EditorInspectorComponent } from './editor-inspector.component';
import { EditorLayersComponent } from './editor-layers.component';
import { EditorMediaPickerComponent } from './editor-media-picker.component';
import { EditorToolbarComponent, ViewportSize } from './editor-toolbar.component';
import { clearRecovery, readRecovery, saveRecovery } from './editor-local-recovery';
import { toApiError } from '../core/api.service';

const AUTOSAVE_DEBOUNCE_MS = 2000;

/**
 * The Phase 2C editor shell (docs/25_VISUAL_EDITOR_ARCHITECTURE.md "Editor
 * architecture"). Resolves `(contentType, slug)` -> `ContentItem` -> its
 * current draft version, or starts a new draft from the published version
 * if none exists yet. Never publicly reachable — this component only
 * exists under `/platform/editor/**`, behind `authGuard` +
 * `permissionGuard('content.view')` (route-level, UX only) with every
 * actual authorization decision made server-side by the same RBAC policy
 * engine every other content endpoint already uses.
 */
@Component({
  selector: 'app-editor-page',
  standalone: true,
  imports: [
    CommonModule,
    EditorToolbarComponent,
    EditorLayersComponent,
    EditorCanvasComponent,
    EditorInspectorComponent,
    EditorAddBlockComponent,
    EditorMediaPickerComponent,
    BlockRendererComponent,
  ],
  providers: [EditorApiService, EditorDocumentService],
  template: `
    @if (loadError()) {
      <div class="be-empty">
        <p class="pf-alert pf-alert-error">{{ loadError() }}</p>
      </div>
    } @else if (!ready()) {
      <div class="be-empty">
        <p class="pf-muted">Loading editor…</p>
      </div>
    } @else if (previewing()) {
      <div class="be-preview-shell">
        <div class="be-toolbar">
          <strong>Preview — {{ item()?.slug }}</strong>
          <div class="be-toolbar-group">
            @for (size of viewportsForPreview; track size) {
              <button
                type="button"
                class="pf-btn pf-btn-sm"
                [class.pf-btn-primary]="viewport() === size"
                (click)="viewport.set(size)"
              >
                {{ size }}
              </button>
            }
            <button
              type="button"
              class="pf-btn pf-btn-primary pf-btn-sm"
              (click)="previewing.set(false)"
            >
              Exit preview
            </button>
          </div>
        </div>
        <div class="be-canvas-scroll">
          <div class="be-canvas-frame" [style.width]="previewWidth()">
            <block-renderer [blocks]="doc.blocks()" />
          </div>
        </div>
      </div>
    } @else {
      @if (submitError()) {
        <div class="pf-alert pf-alert-error" role="alert">{{ submitError() }}</div>
      }
      <div class="be-editor-shell">
        <app-editor-toolbar
          [title]="item()?.slug ?? ''"
          [saveStatus]="saveStatus()"
          [canUndo]="doc.canUndo()"
          [canRedo]="doc.canRedo()"
          [viewport]="viewport()"
          [workflowState]="version()?.state ?? null"
          [canSubmit]="canSubmit()"
          [submitting]="submitting()"
          [versionId]="version()?.id ?? null"
          (viewportChange)="viewport.set($event)"
          (undo)="doc.undo()"
          (redo)="doc.redo()"
          (togglePreview)="previewing.set(true)"
          (save)="saveNow()"
          (submitForReview)="submitForReview()"
        />
        <div class="be-body">
          <aside class="be-panel be-panel-left">
            <app-editor-layers
              [blocks]="doc.blocks()"
              [selectedId]="doc.selectedId()"
              [hoveredId]="doc.hoveredId()"
              (select)="doc.select($event)"
              (hover)="doc.hover($event)"
            />
            <button
              type="button"
              class="pf-btn pf-btn-sm be-add-block-btn"
              (click)="addBlockDialog.open()"
            >
              + Add block
            </button>
          </aside>
          <main class="be-panel be-panel-canvas">
            <app-editor-canvas [viewport]="viewport()" (propChange)="onInlinePropChange($event)" />
          </main>
          <aside class="be-panel be-panel-right">
            <app-editor-inspector
              [block]="doc.selectedBlock()"
              [blockType]="selectedBlockType()"
              (propsChange)="onPropsChange($event)"
              (pickMedia)="onPickMedia($event)"
            />
          </aside>
        </div>
      </div>
      <app-editor-add-block
        #addBlockDialog
        [blockTypes]="blockTypes()"
        (pick)="onAddBlock($event)"
      />
      <app-editor-media-picker
        #mediaPicker
        [ownerVerticalId]="item()?.owner_vertical ?? null"
        (selected)="onMediaSelected($event)"
      />
      @if (recoveryAvailable()) {
        <div class="pf-dialog-overlay be-recovery-banner">
          <div class="pf-card">
            <p>Unsaved local changes were found from a previous session.</p>
            <div class="pf-actions">
              <button type="button" class="pf-btn" (click)="discardRecovery()">Discard</button>
              <button type="button" class="pf-btn pf-btn-primary" (click)="restoreRecovery()">
                Restore
              </button>
            </div>
          </div>
        </div>
      }
      @if (saveStatus() === 'conflict') {
        <div class="pf-dialog-overlay be-conflict-banner">
          <div class="pf-card">
            <h2>This draft changed elsewhere</h2>
            <p class="pf-muted">
              Someone else saved a change to this draft after you loaded it. Your local changes were
              not lost, but saving them now would overwrite theirs.
            </p>
            <div class="pf-actions">
              <button type="button" class="pf-btn" (click)="reloadLatest()">
                Reload latest (discard my changes)
              </button>
              <button type="button" class="pf-btn pf-btn-primary" (click)="keepLocalAndRetry()">
                Keep my changes
              </button>
            </div>
          </div>
        </div>
      }
    }
  `,
})
export class EditorPageComponent implements OnInit, OnDestroy {
  @Input() contentType!: string;
  @Input() slug!: string;

  private route = inject(ActivatedRoute);
  private api = inject(EditorApiService);
  private auth = inject(AuthService);
  doc = inject(EditorDocumentService);

  ready = signal(false);
  loadError = signal<string | null>(null);
  item = signal<ContentItemSummary | null>(null);
  version = signal<ContentVersionRecord | null>(null);
  blockTypes = signal<ContentBlockTypeDef[]>([]);
  saveStatus = signal<SaveStatus>('idle');
  viewport = signal<ViewportSize>('desktop');
  previewing = signal(false);
  recoveryAvailable = signal(false);
  submitting = signal(false);
  submitError = signal<string | null>(null);

  /** Mirrors the server's own transition rule (`workflow.submit`): only a
   * DRAFT version may be submitted, and only once it has no unsaved local
   * changes (submitting saves first, so this just keeps the UI honest about
   * what "Submit for review" is about to do). */
  canSubmit = computed(() => {
    const v = this.version();
    return !!v && v.state === 'DRAFT' && this.saveStatus() !== 'conflict';
  });

  readonly viewportsForPreview: ViewportSize[] = ['desktop', 'tablet', 'mobile'];

  selectedBlockType = computed(() => {
    const block = this.doc.selectedBlock();
    if (!block) return null;
    return this.blockTypes().find((bt) => bt.key === block.type) ?? null;
  });

  private autosaveHandle: ReturnType<typeof setTimeout> | null = null;
  private conflictLocalSnapshot: ReturnType<EditorDocumentService['blocks']> | null = null;

  async ngOnInit(): Promise<void> {
    try {
      const [item, blockTypesPage] = await Promise.all([
        this.api.getItemBySlug(this.contentType, this.slug),
        this.api.getBlockTypes(),
      ]);
      this.item.set(item);
      this.blockTypes.set(blockTypesPage.results);

      // Editor routing (task §1): current draft if one exists, otherwise
      // start a new draft from the published version. An item with
      // neither (never authored, or somehow both null) has nothing to
      // edit yet — surfaced as a load error rather than a blank canvas
      // pretending there's content.
      let version: ContentVersionRecord;
      if (item.draft_version_id) {
        version = await this.api.getVersion(item.draft_version_id);
        // A CHANGES_REQUESTED version is immutable in place (only a DRAFT
        // can be PATCHed — apps.content.workflow.update_draft). Resubmitting
        // after rejection (task §2 "allow draft revision and resubmission
        // after rejection") means spinning up a fresh editable DRAFT from
        // it first, exactly like the published-version fallback below.
        if (version.state === 'CHANGES_REQUESTED') {
          version = await this.api.newDraftFrom(version.id, version.blocks, version.seo);
        }
      } else if (item.published_version_id) {
        const published = await this.api.getVersion(item.published_version_id);
        version = await this.api.newDraftFrom(published.id, published.blocks, published.seo);
      } else {
        throw new Error('This item has no content to edit yet.');
      }
      this.version.set(version);
      this.doc.load(version.blocks.blocks);

      const recovery = readRecovery(this.userId(), version.id);
      if (recovery && JSON.stringify(recovery.blocks) !== JSON.stringify(version.blocks.blocks)) {
        this.recoveryAvailable.set(true);
      }
      this.ready.set(true);
    } catch (e) {
      const err = toApiError(e);
      this.loadError.set(
        err.status === 404
          ? 'This page could not be found, or you do not have access to edit it.'
          : 'Could not load the editor. Please try again.',
      );
    }
  }

  private userId(): string {
    return this.auth.user()?.id ?? 'anon';
  }

  ngOnDestroy(): void {
    if (this.autosaveHandle) clearTimeout(this.autosaveHandle);
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    const mod = e.ctrlKey || e.metaKey;
    if (!mod) return;
    if (e.key.toLowerCase() === 'z' && !e.shiftKey) {
      e.preventDefault();
      this.doc.undo();
    } else if (e.key.toLowerCase() === 'z' && e.shiftKey) {
      e.preventDefault();
      this.doc.redo();
    } else if (e.key.toLowerCase() === 's') {
      e.preventDefault();
      this.saveNow();
    }
  }

  onPropsChange(patch: Record<string, unknown>): void {
    const id = this.doc.selectedId();
    if (!id) return;
    this.doc.updateBlockProps(id, patch);
    this.scheduleAutosave();
  }

  /** Inline canvas text edits (`ui-inline-text` via `BlockEditorHost.updateProp`) —
   * same autosave path as the side panel's `onPropsChange`, just keyed by the
   * edited block's own id instead of always the current selection. */
  onInlinePropChange(change: { id: string; key: string; value: unknown }): void {
    this.doc.updateBlockProps(change.id, { [change.key]: change.value });
    this.scheduleAutosave();
  }

  onAddBlock(typeKey: string): void {
    const bt = this.blockTypes().find((b) => b.key === typeKey);
    if (!bt) return;
    this.doc.addBlock(typeKey, defaultPropsFor(bt.json_schema.props), this.doc.selectedId());
    this.scheduleAutosave();
  }

  private pendingImageTarget: { prop: string; index?: number; field?: string } | null = null;
  @ViewChild('mediaPicker') mediaPicker?: EditorMediaPickerComponent;

  onPickMedia(target: { prop: string; index?: number; field?: string }): void {
    this.pendingImageTarget = target;
    this.mediaPicker?.open();
  }

  onMediaSelected(picked: { assetId: string; alt: string }): void {
    const target = this.pendingImageTarget;
    const id = this.doc.selectedId();
    if (!target || !id) return;
    const block = this.doc.selectedBlock();
    if (!block) return;
    const imageValue = { source: 'media', asset_id: picked.assetId, alt: picked.alt };
    if (target.index === undefined) {
      this.doc.updateBlockProps(id, { [target.prop]: imageValue });
    } else {
      const list = [...((block.props[target.prop] as unknown[]) ?? [])];
      const item = { ...(list[target.index] as Record<string, unknown>) };
      item[target.field ?? 'image'] = imageValue;
      list[target.index] = item;
      this.doc.updateBlockProps(id, { [target.prop]: list });
    }
    this.scheduleAutosave();
  }

  private scheduleAutosave(): void {
    this.saveStatus.set('dirty');
    saveRecovery(this.userId(), this.version()!.id, this.doc.blocks());
    if (this.autosaveHandle) clearTimeout(this.autosaveHandle);
    this.autosaveHandle = setTimeout(() => void this.saveNow(), AUTOSAVE_DEBOUNCE_MS);
  }

  async saveNow(): Promise<void> {
    const version = this.version();
    if (!version || !this.doc.isDirty()) return;
    if (this.autosaveHandle) {
      clearTimeout(this.autosaveHandle);
      this.autosaveHandle = null;
    }
    this.saveStatus.set('saving');
    try {
      const saved = await this.api.saveDraft(
        version.id,
        this.doc.toDocument(),
        version.seo,
        version.updated_at,
      );
      this.version.set(saved);
      this.doc.markSaved();
      this.saveStatus.set('saved');
      clearRecovery(this.userId(), version.id);
    } catch (e) {
      const err = toApiError(e);
      if (err.code === 'stale_version' || err.status === 409) {
        this.conflictLocalSnapshot = this.doc.blocks();
        this.saveStatus.set('conflict');
        try {
          const fresh = await this.api.getVersion(version.id);
          this.version.update((v) => (v ? { ...v, updated_at: fresh.updated_at } : v));
        } catch {
          // keep showing the conflict state if the refetch itself fails
        }
      } else {
        this.saveStatus.set('error');
      }
    }
  }

  async reloadLatest(): Promise<void> {
    const version = this.version();
    if (!version) return;
    const fresh = await this.api.getVersion(version.id);
    this.version.set(fresh);
    this.doc.load(fresh.blocks.blocks);
    this.saveStatus.set('idle');
    clearRecovery(this.userId(), version.id);
  }

  async keepLocalAndRetry(): Promise<void> {
    const version = this.version();
    if (!version || !this.conflictLocalSnapshot) return;
    const fresh = await this.api.getVersion(version.id); // pick up the new expected_updated_at
    this.version.set(fresh);
    // The server's latest content becomes the new baseline; the working
    // document stays the user's local edits, so isDirty() is still true
    // and the retry below actually sends them, rather than load()'s
    // "this is already saved" semantics silently no-op'ing the save.
    this.doc.restoreLocalOverBaseline(fresh.blocks.blocks, this.conflictLocalSnapshot);
    await this.saveNow();
  }

  restoreRecovery(): void {
    const version = this.version();
    if (!version) return;
    const recovery = readRecovery(this.userId(), version.id);
    if (recovery) {
      this.doc.load(recovery.blocks);
      this.saveStatus.set('dirty');
    }
    this.recoveryAvailable.set(false);
  }

  discardRecovery(): void {
    const version = this.version();
    if (version) clearRecovery(this.userId(), version.id);
    this.recoveryAvailable.set(false);
  }

  async submitForReview(): Promise<void> {
    const version = this.version();
    if (!version || this.submitting()) return;
    this.submitting.set(true);
    this.submitError.set(null);
    try {
      if (this.doc.isDirty()) await this.saveNow();
      const submitted = await this.api.submit(this.version()!.id);
      this.version.set(submitted);
    } catch (e) {
      this.submitError.set(toApiError(e).message || 'Could not submit for review.');
    } finally {
      this.submitting.set(false);
    }
  }

  previewWidth(): string {
    return this.viewport() === 'desktop'
      ? '100%'
      : this.viewport() === 'tablet'
        ? '48rem'
        : '24rem';
  }
}
