import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  signal,
  viewChild,
} from '@angular/core';
import { EditorApiService, MediaAssetRecord } from './editor-api.service';

/**
 * The media picker (task §13). Lists only media the signed-in user is
 * authorized to see (`GET /content/media`, scoped server-side by
 * `apps.content.views._visible_media` — a Vertical Head never sees another
 * vertical's assets here, enforced by the API, not by this component
 * hiding rows). Uploads go through the Phase 2A signed-upload flow
 * (`GET /content/media/upload-params` -> direct POST to Cloudinary with a
 * server-issued signature -> `POST /content/media` records the result) —
 * the Cloudinary API secret never reaches this component or any other
 * Angular code; only a short-lived signature does.
 */
@Component({
  selector: 'app-editor-media-picker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <dialog #dlg class="pf-dialog be-media-dialog" (close)="closed.emit()">
      <h2>Media library</h2>
      @if (error()) {
        <p class="pf-alert pf-alert-error">{{ error() }}</p>
      }
      <div class="be-media-upload">
        <label class="pf-btn pf-btn-sm">
          Upload new
          <input
            type="file"
            accept="image/*"
            style="display:none"
            (change)="onFileSelected($event)"
          />
        </label>
        @if (uploading()) {
          <span class="pf-muted">Uploading…</span>
        }
      </div>
      <div class="be-media-grid">
        @for (asset of assets(); track asset.id) {
          <button type="button" class="be-media-tile" (click)="choose(asset)">
            <img [src]="asset.delivery_url" [alt]="asset.alt_text" loading="lazy" />
            <span class="be-media-tile-alt">{{ asset.alt_text || 'No alt text' }}</span>
          </button>
        } @empty {
          <p class="pf-muted">No media uploaded yet in your scope.</p>
        }
      </div>
      <div class="pf-dialog-actions">
        <button type="button" class="pf-btn" (click)="close()">Cancel</button>
      </div>
    </dialog>
  `,
})
export class EditorMediaPickerComponent {
  @Input() ownerVerticalId: string | null = null;
  @Output() selected = new EventEmitter<{ assetId: string; alt: string }>();
  @Output() closed = new EventEmitter<void>();

  private dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');
  private api: EditorApiService;

  assets = signal<MediaAssetRecord[]>([]);
  uploading = signal(false);
  error = signal<string | null>(null);

  constructor(api: EditorApiService) {
    this.api = api;
  }

  async open(): Promise<void> {
    this.error.set(null);
    this.dlg().nativeElement.showModal();
    try {
      const page = await this.api.listMedia();
      this.assets.set(page.results);
    } catch {
      this.error.set('Could not load media library.');
    }
  }

  close(): void {
    this.dlg().nativeElement.close();
  }

  choose(asset: MediaAssetRecord): void {
    this.selected.emit({ assetId: asset.id, alt: asset.alt_text });
    this.close();
  }

  async onFileSelected(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploading.set(true);
    this.error.set(null);
    try {
      const params = await this.api.getMediaUploadParams(this.ownerVerticalId);
      const form = new FormData();
      form.append('file', file);
      form.append('api_key', params.api_key);
      form.append('timestamp', String(params.timestamp));
      form.append('signature', params.signature);
      form.append('folder', params.folder);
      const res = await fetch(params.endpoint, { method: 'POST', body: form });
      if (!res.ok) throw new Error('Cloudinary upload failed');
      const uploaded = await res.json();
      const asset = await this.api.recordMediaAsset({
        cloudinary_public_id: uploaded.public_id,
        delivery_url: uploaded.secure_url,
        width: uploaded.width,
        height: uploaded.height,
        mime_type: uploaded.resource_type ? `image/${uploaded.format}` : undefined,
        file_size: uploaded.bytes,
        owner_vertical_id: this.ownerVerticalId,
      });
      this.assets.update((list) => [asset, ...list]);
    } catch {
      this.error.set('Upload failed. The image was not saved — this content is unaffected.');
    } finally {
      this.uploading.set(false);
    }
  }
}
