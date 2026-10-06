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

/**
 * `apps.content.dynamic_queries._serialize_event`'s full field set — the
 * canonical shape for `published_events_upcoming`/`published_events_past`.
 * Consumed by both the generic `block-dynamic-query` renderer (a reduced
 * local subset) and `EventsComponent` (the full shape, for galleries/
 * speakers/CTAs).
 */
export interface EventQueryResult {
  slug: string;
  title: string;
  kind?: string;
  starts_at?: string | null;
  ends_at?: string | null;
  venue?: string;
  summary?: string;
  description?: string;
  time_label?: string;
  audience?: string;
  organizer?: string;
  registration_status?: string;
  registration_link?: string;
  turnout?: string;
  pending?: boolean;
  linkedin_url?: string;
  source?: string;
  hashtags?: string[];
  speakers?: { name: string; designation?: string; org?: string }[];
  featured_image?: string;
  gallery?: { src: string; alt: string }[];
  /** Join key into Angular's `initiatives.data.ts` catalogue — see
   * `EventDetail.related_initiative` on the backend for why this isn't a
   * real FK/second initiative model. */
  related_initiative?: string;
}
