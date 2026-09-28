/**
 * Mirrors backend/apps/content/validation.py's block document shape exactly
 * (docs/25_VISUAL_EDITOR_ARCHITECTURE.md). This is the ONE contract the
 * public renderer and the future editor preview (Phase 2C) both consume —
 * there must never be a second, divergent shape.
 */

export interface ImageProp {
  source: 'media' | 'external';
  asset_id?: string;
  /** As-authored for source=external; resolved server-side from the
   * referenced MediaAsset for source=media (apps.content.media_resolution). */
  url?: string;
  alt?: string;
  width?: number | null;
  height?: number | null;
}

export interface BlockNode {
  id: string;
  type: string;
  props: Record<string, unknown>;
  children?: BlockNode[];
}

export interface ContentDocument {
  schema_version: number;
  blocks: BlockNode[];
}

export interface PublicContentResponse {
  content_type: string;
  slug: string;
  blocks: ContentDocument;
  seo: { title?: string; description?: string; path?: string };
  published_at: string;
}

/** apps.content.dynamic_queries.resolve's response shape. */
export interface DynamicQueryResponse<T = Record<string, unknown>> {
  query: string;
  sort: string;
  count: number;
  results: T[];
}
