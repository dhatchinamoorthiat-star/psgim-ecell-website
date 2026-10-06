import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ImageProp } from '../block.types';
import { BlockImageComponent } from './block-image.component';
import { BlockEditorHost } from '../block-editor-host';

interface GalleryItem {
  image?: ImageProp | null;
  file?: string;
  caption?: string;
  album?: string;
  ratio?: 'landscape' | 'portrait' | 'square';
}

interface GalleryProps {
  heading?: string;
  images: GalleryItem[];
}

/**
 * Reuses `.gallery-grid`/`.gallery-tile.ratio-{ratio}`/`.caption` verbatim
 * (`features/gallery/gallery.component.html`). Delegates image rendering
 * to the shared `BlockImageComponent` (handles both `source: "external"`
 * and backend-resolved `source: "media"` uniformly) rather than
 * duplicating that logic here. When an item has no resolvable image (the
 * current site's actual state for existing gallery data — see
 * `legacy_migration.migrate_gallery`), it renders the same captioned
 * placeholder tile the legacy page already shows, not a broken `<img>`.
 */
@Component({
  selector: 'block-gallery',
  standalone: true,
  imports: [CommonModule, BlockImageComponent],
  template: `
    <section class="section wrap">
      @if (props.heading) {
        <div class="section-heading">
          <h2>{{ props.heading }}</h2>
        </div>
      }
      <div class="gallery-grid" style="margin-top: var(--s-7)">
        @for (item of props.images; track item.file || item.caption || $index) {
          <div class="gallery-tile ratio-{{ item.ratio || 'landscape' }}">
            @if (item.image?.url) {
              <block-image
                [image]="{ ...item.image!, alt: item.image!.alt || item.caption || '' }"
              />
            } @else if (item.caption) {
              <span class="caption">{{ item.caption }}</span>
            }
          </div>
        }
      </div>
    </section>
  `,
})
export class BlockGalleryComponent {
  @Input({ required: true }) props!: GalleryProps;
  @Input() blockId = '';
  @Input() editorHost: BlockEditorHost | null = null;
}
