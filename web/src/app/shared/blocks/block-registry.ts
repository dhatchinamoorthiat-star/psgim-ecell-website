import { Type } from '@angular/core';
import { BlockCardGridComponent } from './components/block-card-grid.component';
import { BlockCtaComponent } from './components/block-cta.component';
import { BlockDynamicQueryComponent } from './components/block-dynamic-query.component';
import { BlockGalleryComponent } from './components/block-gallery.component';
import { BlockHeroComponent } from './components/block-hero.component';
import { BlockRichTextComponent } from './components/block-rich-text.component';
import { BlockStatsComponent } from './components/block-stats.component';
import { BlockTeamGridComponent } from './components/block-team-grid.component';
import { BlockTimelineComponent } from './components/block-timeline.component';

/**
 * The ONLY place a block `type` string is mapped to an Angular component.
 * `BlockRendererComponent` looks up `block.type` here and nowhere else —
 * an unregistered key simply isn't rendered (see its template's `@if
 * (registry.has(...))`). There is no code path from CMS-authored content
 * to a dynamically-constructed component selector, `eval`, `Function(...)`,
 * or template compilation — every value here is a statically imported
 * class, closed over this module (docs/25_VISUAL_EDITOR_ARCHITECTURE.md
 * "Shared renderer invariant"). `section_heading` has no dedicated
 * component — every other block already renders its own optional heading
 * (`props.heading`), so a bare `section_heading` block (no body content)
 * is intentionally not registered yet; it exists in the Phase 2A catalogue
 * for a future standalone-heading use, not represented in any Phase 2B
 * page.
 */
export const BLOCK_REGISTRY: ReadonlyMap<string, Type<unknown>> = new Map<string, Type<unknown>>([
  ['hero', BlockHeroComponent],
  ['rich_text', BlockRichTextComponent],
  ['stats', BlockStatsComponent],
  ['timeline', BlockTimelineComponent],
  ['card_grid', BlockCardGridComponent],
  ['gallery', BlockGalleryComponent],
  ['team_grid', BlockTeamGridComponent],
  ['cta', BlockCtaComponent],
  ['dynamic_query', BlockDynamicQueryComponent],
]);
