import { BlockNode } from '../../shared/blocks/block.types';

/** Mirrors backend/apps/content/models.ContentBlockType (fetched read-only from
 * GET /content/block-types) — the one source of truth for what block types and
 * props exist. The editor never hardcodes a second copy of the catalogue. */
export interface PropSpec {
  type: 'string' | 'url' | 'int' | 'bool' | 'image' | 'object' | 'list';
  required?: boolean;
  max_length?: number;
  max_items?: number;
  enum?: string[];
  item_type?: string;
  item_schema?: { properties: Record<string, PropSpec> };
  properties?: Record<string, PropSpec>;
}

export interface ContentBlockTypeDef {
  id: string;
  key: string;
  label: string;
  json_schema: { props: Record<string, PropSpec> };
  version: number;
  is_active: boolean;
  allowed_parent_keys: string[];
}

export interface ContentItemSummary {
  id: string;
  content_type: string;
  slug: string;
  owner_vertical: string | null;
  state: string;
  published_version_number: number | null;
  draft_version_number: number | null;
  published_version_id: string | null;
  draft_version_id: string | null;
  publish_at: string | null;
  unpublish_at: string | null;
  is_verified: boolean;
  created_at: string;
}

export interface ContentVersionRecord {
  id: string;
  content_item: string;
  content_type: string;
  slug: string;
  number: number;
  state: string;
  blocks: { schema_version: number; blocks: BlockNode[] };
  seo: { title?: string; description?: string; path?: string };
  author_email: string;
  change_note: string;
  approval_stages_snapshot: unknown[];
  created_at: string;
  updated_at: string;
}

export type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error' | 'conflict';
