import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ImageProp } from '../block.types';

/**
 * Resolves a structured `image` prop (backend/apps/content/validation.py
 * `_validate_image`) into an `<img>`. Never `[innerHTML]`, never a raw
 * string prop treated as a URL — the schema is the only thing trusted.
 *
 * `source: "media"` values arrive already resolved by the backend
 * (`apps.content.media_resolution.resolve_blocks_media`, called by
 * `PublicContentDetailView` before the response leaves the server): `url`
 * and `alt` are filled in from the referenced `MediaAsset`. This component
 * never resolves an `asset_id` itself and never talks to Cloudinary — it
 * only ever renders a `url` it was handed. A dangling/deleted asset
 * reference resolves to `url: undefined` server-side, so it renders
 * nothing here — never a broken image request, never a 500.
 */
@Component({
  selector: 'block-image',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (image?.url) {
      <img [src]="image!.url" [alt]="image!.alt || ''" [class]="imgClass" loading="lazy" />
    }
  `,
})
export class BlockImageComponent {
  @Input() image: ImageProp | null | undefined;
  @Input() imgClass = '';
}
