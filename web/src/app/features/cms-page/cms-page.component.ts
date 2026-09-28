import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, inject, signal } from '@angular/core';
import { ContentApiService } from '../../core/services/content-api.service';
import { SeoService } from '../../core/services/seo.service';
import { BlockRendererComponent } from '../../shared/blocks/block-renderer.component';
import { BlockNode } from '../../shared/blocks/block.types';

/**
 * The Phase 2B cutover-route component (docs/22_MIGRATION_MATRIX.md,
 * docs/25_VISUAL_EDITOR_ARCHITECTURE.md "Migration impact"). Deliberately
 * an ADDITIONAL route (`/content/:contentType/:slug`), not a replacement
 * of any of the 17 existing prerendered pages — no legacy route or
 * component is touched. This is also literally the "EditorPreview"
 * context the architecture requires to share the same renderer: it and
 * the eventual Phase 2C editor preview both wrap the same
 * `BlockRendererComponent` around a document, differing only in where the
 * document comes from (published API here; an in-progress draft there).
 *
 * Fetches only `PublicContentDetailView` (published_version only — never a
 * draft/submitted/in-review/approved/scheduled/archived version, enforced
 * server-side, see backend/apps/content/views.py). A slug with no
 * published version 404s here exactly as it does at the API.
 */
@Component({
  selector: 'app-cms-page',
  standalone: true,
  imports: [CommonModule, BlockRendererComponent],
  template: `
    @if (blocks(); as b) {
      <block-renderer [blocks]="b" />
    } @else if (notFound()) {
      <section class="section wrap">
        <h1>Not found</h1>
        <p>This page has not been published yet.</p>
      </section>
    }
  `,
})
export class CmsPageComponent implements OnChanges {
  @Input({ required: true }) contentType!: string;
  @Input({ required: true }) slug!: string;

  private api = inject(ContentApiService);
  private seo = inject(SeoService);

  blocks = signal<BlockNode[] | null>(null);
  notFound = signal(false);

  ngOnChanges(): void {
    this.blocks.set(null);
    this.notFound.set(false);
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      const page = await this.api.getPage(this.contentType, this.slug);
      this.blocks.set(page.blocks.blocks);
      if (page.seo?.title && page.seo?.description) {
        this.seo.set({
          title: page.seo.title,
          description: page.seo.description,
          path: page.seo.path || `/content/${this.contentType}/${this.slug}/`,
        });
      }
    } catch {
      this.notFound.set(true);
    }
  }
}
